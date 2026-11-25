import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { tsImport } from "tsx/esm/api";

const { values } = parseArgs({
  options: {
    url: { type: "string" }, file: { type: "string" }, dealer: { type: "string" },
    city: { type: "string" }, oib: { type: "string" }, phone: { type: "string" },
    "profile-id": { type: "string" }, "dry-run": { type: "boolean" }, help: { type: "boolean", short: "h" },
  },
});

async function main() {
  if (values.help) {
    console.log("npm run import:feed -- (--url <https-url> | --file <path>) --dealer <name> --city <city> --oib <11 digits> --phone <phone> [--profile-id <uuid>] [--dry-run]");
    return;
  }
  if (Boolean(values.url) === Boolean(values.file) || !values.dealer?.trim() || !values.city?.trim() ||
      !/^\d{11}$/.test(values.oib ?? "") || !/^\+?[\d ()/-]{7,30}$/.test(values.phone ?? "")) {
    throw new Error("Provide one source, a dealership name, a city, an 11-digit OIB and a phone number. Use --help for syntax.");
  }
  const { maxFeedBytes, parseDealershipFeed, readFeedResponse } = await tsImport("../src/lib/dealership-feed.ts", import.meta.url);
  const { vehicles: catalog, countyByCity, marketValuation } = await tsImport("../app/catalog.ts", import.meta.url);
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (Boolean(projectUrl) !== Boolean(serviceKey) && !values["dry-run"]) throw new Error("Configure both Supabase URL and service role key, or neither.");
  const supabase = projectUrl && serviceKey && !values["dry-run"]
    ? createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  let profileId;
  if (supabase) {
    const query = supabase.from("profiles").select("id,oib,account_type");
    const { data: profiles, error } = await (values["profile-id"] ? query.eq("id", values["profile-id"]) : query.eq("oib", values.oib)).limit(2);
    if (error) throw new Error("Supabase profile lookup failed: " + error.message);
    if (profiles.length !== 1 || (profiles[0].oib && profiles[0].oib !== values.oib)) {
      throw new Error("Identify an existing Supabase dealer account by OIB or --profile-id. The profiles table references auth.users.");
    }
    profileId = profiles[0].id;
  }
  const dealerId = "feed-" + createHash("sha256").update(values.oib).digest("hex").slice(0, 20);
  const city = values.city.trim();
  const dealer = { id: profileId ?? dealerId, name: values.dealer.trim(), city, county: countyByCity[city], phone: values.phone.trim() };
  let content, base;
  if (values.file) {
    if ((await stat(values.file)).size > maxFeedBytes) throw new Error("Feed exceeds 8 MB.");
    content = await readFile(values.file, "utf8");
  } else {
    const source = new URL(values.url);
    if (source.protocol !== "https:" || source.username || source.password) throw new Error("Use a public HTTPS feed URL without embedded credentials.");
    const response = await fetch(source, { signal: AbortSignal.timeout(20000), redirect: "follow" });
    if (new URL(response.url).protocol !== "https:") throw new Error("The feed redirected away from HTTPS.");
    base = response.url;
    content = await readFeedResponse(response);
  }
  const feed = await parseDealershipFeed(content, dealer, base);
  const dir = new URL("../data/", import.meta.url);
  const destination = new URL("imported-listings.json", dir);
  const lockPath = new URL("imported-listings.lock", dir);
  let lock;
  try {
    if (!values["dry-run"]) {
      await mkdir(dir, { recursive: true });
      try { lock = await open(lockPath, "wx"); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        throw new Error("Another local import holds data/imported-listings.lock.");
      }
    }
    const previous = JSON.parse(await readFile(destination, "utf8").catch(error => {
      if (error.code === "ENOENT") return "[]";
      throw error;
    }));
    const byId = new Map(previous.map(vehicle => [vehicle.id, vehicle]));
    const staticVins = new Set(catalog.filter(vehicle => !byId.has(vehicle.id)).map(vehicle => vehicle.vin).filter(Boolean));
    const vinIndex = new Map(previous.filter(vehicle => vehicle.vin).map(vehicle => [vehicle.vin, vehicle]));
    const externalIndex = new Map(previous.filter(vehicle => [dealerId, profileId].includes(vehicle.dealershipId) && vehicle.externalId).map(vehicle => [vehicle.externalId, vehicle]));
    const remoteByVin = new Map();
    if (supabase) {
      const vins = [...new Set(feed.vehicles.map(vehicle => vehicle.vin).filter(Boolean))];
      for (let start = 0; start < vins.length; start += 100) {
        const { data, error } = await supabase.from("listings").select("id,user_id,vin").in("vin", vins.slice(start, start + 100));
        if (error) throw new Error("Supabase VIN lookup failed: " + error.message);
        for (const row of data) remoteByVin.set(row.vin, row);
      }
    }
    const imported = new Map();
    for (const vehicle of feed.vehicles) {
      const vinMatch = vinIndex.get(vehicle.vin);
      const remote = remoteByVin.get(vehicle.vin);
      if (staticVins.has(vehicle.vin) || (vinMatch && ![dealerId, profileId].includes(vinMatch.dealershipId)) || (remote && remote.user_id !== profileId)) {
        feed.skipped++;
        continue;
      }
      const existing = vinMatch || externalIndex.get(vehicle.externalId) || byId.get(vehicle.id);
      const id = remote?.id || existing?.id || vehicle.id;
      const valuation = marketValuation(vehicle);
      const { rating, medianMarketPrice, deltaPercent } = valuation;
      const normalized = { ...vehicle, id, valuation: { label: rating.label, medianMarketPrice, deltaPercent } };
      if (existing?.price > vehicle.price) normalized.previousPriceEur = existing.price;
      imported.set(id, normalized);
      if (existing && existing.id !== id) byId.delete(existing.id);
      byId.set(id, normalized);
    }
    const rows = [...imported.values()];
    if (supabase && rows.length) await syncSupabase(supabase, profileId, dealer, rows);
    if (!values["dry-run"] && rows.length) {
      const temporary = new URL("imported-listings." + randomUUID() + ".tmp", dir);
      try {
        await writeFile(temporary, JSON.stringify([...byId.values()], null, 2) + "\n", "utf8");
        await rename(temporary, destination);
      } finally {
        await rm(temporary, { force: true });
      }
    }
    console.log(JSON.stringify({ dryRun: Boolean(values["dry-run"]), imported: rows.length, skipped: feed.skipped,
      issues: feed.issues, vehicles: rows.map(({ title, price, valuation }) => ({ title, price, valuation })) }, null, 2));
  } finally {
    if (lock) {
      await lock.close();
      await rm(lockPath, { force: true });
    }
  }
}

async function syncSupabase(client, id, dealer, vehicles) {
  const { error: profileError } = await client.from("profiles").upsert({
    id, account_type: "dealer", role: "dealer", company_name: dealer.name, dealership_name: dealer.name,
    city: dealer.city, county: dealer.county ?? null, phone: dealer.phone, oib: values.oib,
  }, { onConflict: "id" });
  if (profileError) throw new Error("Supabase profile upsert failed: " + profileError.message);
  for (let start = 0; start < vehicles.length; start += 100) {
    const rows = vehicles.slice(start, start + 100).map(vehicle => ({
      id: vehicle.id, user_id: id, owner_id: id, status: "active", title: vehicle.title,
      make: vehicle.make, model: vehicle.model, generation: vehicle.generation, trim: vehicle.trim,
      body_style: vehicle.bodyType, year: Number(vehicle.date.slice(0, 4)), month: Number(vehicle.date.slice(5, 7)),
      mileage: vehicle.km, power_kw: vehicle.kw, engine_cc: vehicle.cc, co2: vehicle.co2,
      fuel: vehicle.fuel, transmission: vehicle.gear, drivetrain: vehicle.drive, color: vehicle.color ?? null,
      price_eur: vehicle.price, vin: vehicle.vin || null, city: dealer.city, county: dealer.county ?? null,
      vat_deductible: vehicle.flags.includes("pdv"), cvh_verified: vehicle.flags.includes("cvh"),
      description: vehicle.sellerNote, images: vehicle.photos.map(photo => photo.src),
      equipment: Object.values(vehicle.equipment).flat(),
    }));
    const { error } = await client.from("listings").upsert(rows, { onConflict: "id" });
    if (error) throw new Error("Supabase listing upsert failed after " + start + " rows: " + error.message);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

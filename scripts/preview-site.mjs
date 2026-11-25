import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseEnv } from "node:util";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.mjs";
import { tsImport } from "tsx/esm/api";
import { analyzeListing } from "../worker/analyze-listing.mjs";

const localEnv = await readFile(".env.local", "utf8").then(parseEnv, error => {
  if (error.code === "ENOENT") return {};
  throw error;
});
const visionEnv = Object.fromEntries(["OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_VISION_MODEL",
  "OPENROUTER_API_KEY", "OPENROUTER_VISION_MODEL", "NEXT_PUBLIC_9ROUTER_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]
  .filter(key => localEnv[key]).map(key => [key, localEnv[key]]));
const publicShare = process.env.AUTOPLAC_SHARE === "1";
if (!publicShare && !process.env.AUTOPLAC_PREVIEW_DB) await mkdir(".local-data", { recursive: true });
const env = { ...localEnv, ...process.env };
const { importClassifieds } = await tsImport("../src/lib/classifieds-import.ts", import.meta.url);
const { supabaseHealth } = await tsImport("../src/lib/supabase/health.ts", import.meta.url);
const database = new DatabaseSync(publicShare ? ":memory:" : process.env.AUTOPLAC_PREVIEW_DB || ".local-data/marketplace.sqlite");
database.exec("PRAGMA foreign_keys=ON");
if (!database.prepare("SELECT name FROM sqlite_master WHERE name='account'").get()) {
  database.exec(await readFile("drizzle/0000_marketplace.sql", "utf8"));
}
const execute = (statement, args, type) => {
  if (type === "first") return statement.get(...args) ?? null;
  if (type === "all" || /^SELECT/i.test(statement.sourceSQL)) return { results: statement.all(...args), meta: { changes: 0 } };
  return { meta: statement.run(...args) };
};
const DB = {
  prepare(sql) {
    return { bind(...args) {
      const statement = database.prepare(sql);
      return { run: () => execute(statement,args,"run"), first: () => execute(statement,args,"first"), all: () => execute(statement,args,"all") };
    } };
  },
  batch(statements) {
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = statements.map(statement => statement.run());
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
};
const root = resolve("out");
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".txt":"text/plain; charset=utf-8", ".webp":"image/webp", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".svg":"image/svg+xml", ".woff2":"font/woff2" };
const ASSETS = { async fetch(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const target = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!target.startsWith(root + sep)) return new Response(null, {status:404});
  try { return new Response(await readFile(target), {headers:{"content-type":types[extname(target)] || "application/octet-stream"}}); }
  catch {
    if (!extname(target)) {
      try { return new Response(await readFile(target + ".html"), {headers:{"content-type":types[".html"]}}); } catch {}
    }
    return new Response(null,{status:404});
  }
} };
const port = Number(process.argv[2] || 4323);
const origin = "http://127.0.0.1:" + port;
const bind = process.env.AUTOPLAC_PREVIEW_HOST || "0.0.0.0";
function requestOrigin(headers) {
  const host = headers.host || "";
  if (env.AUTOPLAC_PUBLIC_ORIGIN && new URL(env.AUTOPLAC_PUBLIC_ORIGIN).host === host) return new URL(env.AUTOPLAC_PUBLIC_ORIGIN).origin;
  if (/^[a-z0-9-]+\.trycloudflare\.com$/i.test(host)) return "https://" + host;
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host) ? "http://" + host : origin;
}
createServer(async (req, res) => {
  try {
    if (req.url === "/__autoplac_share" && req.method === "GET") {
      res.writeHead(200, {"content-type":"text/plain", "cache-control":"no-store"});res.end("autoplac-share-preview-v1");return;
    }
    const maxBytes = req.url?.startsWith("/api/analyze-") ? 6 * 1024 * 1024 : 1800000;
    let chunks = [], size=0;
    for await (const chunk of req) {
      size+=chunk.length;
      if (size > maxBytes) {
        res.writeHead(413, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify({ error: "Zahtjev je prevelik." }));
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(new URL(req.url,requestOrigin(req.headers)), {method:req.method, headers:req.headers, body:chunks.length ? Buffer.concat(chunks) : undefined});
    const pathname = new URL(request.url).pathname;
    let result;
    if (pathname === "/api/health" && request.method === "GET") {
      result = await supabaseHealth(env);
    } else if (pathname === "/api/import-url") {
      result = publicShare ? new Response(null, { status: 404 }) : await importClassifieds(request, env,
        photos => analyzeListing({ photos }, { ...visionEnv, ...process.env }));
    } else if (["GET", "HEAD"].includes(request.method) && /^\/uploads\/imported\/[a-z0-9-]+\/[a-f0-9]{24}\.webp$/.test(pathname)) {
      const file = await readFile(resolve("public", "." + pathname)).catch(() => undefined);
      result = file ? new Response(file, { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" } }) : new Response(null, { status: 404 });
    } else {
      result = await worker.fetch(request,publicShare ? { DB, ASSETS } : { ...visionEnv, ...process.env, DB, ASSETS });
    }
    res.writeHead(result.status,Object.fromEntries(result.headers));
    res.end(req.method === "HEAD" ? undefined : Buffer.from(await result.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end(); }
}).listen(port,bind,()=>console.log("Local: "+origin));

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();
const outDir = path.join(root, ".tmp-check");
fs.rmSync(outDir, { recursive: true, force: true });

function compileDir(entryFiles) {
  const host = ts.createCompilerHost({
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
    esModuleInterop: true,
    skipLibCheck: true,
    outDir,
    rootDir: root,
  });
  const program = ts.createProgram(entryFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
    esModuleInterop: true,
    skipLibCheck: true,
    outDir,
    rootDir: root,
  }, host);
  program.emit();
}

function patchJsExtensions(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchJsExtensions(full);
    } else if (entry.name.endsWith(".js")) {
      let src = fs.readFileSync(full, "utf8");
      src = src.replace(/(from\s+["'])(\.\.?\/[^"']+?)(["'])/g, (_, pre, spec, post) => {
        if (spec.endsWith(".json")) return `${pre}${spec}${post}`;
        return spec.endsWith(".js") ? `${pre}${spec}${post}` : `${pre}${spec}.js${post}`;
      });
      src = src.replace(/(import\s+photoData\s+from\s+["']\.\/photos\.json["']);/, "$1 with { type: 'json' };");
      fs.writeFileSync(full, src, "utf8");
    }
  }
}

try {
  compileDir([
    path.join(root, "src/data/car-catalog.ts"),
    path.join(root, "src/lib/spec-resolver.ts"),
    path.join(root, "src/data/equipment-catalog.ts"),
    path.join(root, "src/lib/photo-scanner.ts"),
    path.join(root, "src/lib/price-engine.ts"),
  ]);
  fs.copyFileSync(path.join(root, "app/photos.json"), path.join(outDir, "app/photos.json"));
  patchJsExtensions(outDir);

  const carCatalog = await import(pathToFileURL(path.join(outDir, "src/data/car-catalog.js")).href);
  const specResolver = await import(pathToFileURL(path.join(outDir, "src/lib/spec-resolver.js")).href);
  const equipCatalog = await import(pathToFileURL(path.join(outDir, "src/data/equipment-catalog.js")).href);
  const photoScanner = await import(pathToFileURL(path.join(outDir, "src/lib/photo-scanner.js")).href);
  const priceEngine = await import(pathToFileURL(path.join(outDir, "src/lib/price-engine.js")).href);

  // 1. Catalog coverage assertions
  const makes = carCatalog.CAR_MAKES;
  const totalModels = makes.reduce((sum, make) => sum + Object.keys(carCatalog.CAR_CATALOG[make]).length, 0);
  assert.ok(makes.length >= 80, `Expected >= 80 brands, got ${makes.length}`);
  assert.ok(totalModels >= 800, `Expected >= 800 models, got ${totalModels}`);
  for (const make of makes) {
    const withOther = carCatalog.modelsFor(make, true);
    assert.ok(withOther.includes(carCatalog.OTHER_MODEL), `${make} missing OTHER_MODEL`);
    for (const modelName of Object.keys(carCatalog.CAR_CATALOG[make])) {
      const model = carCatalog.modelFor(make, modelName);
      assert.ok(
        model?.generations.some(g => g.codes.includes(carCatalog.OTHER_GENERATION)),
        `${make} ${modelName} missing OTHER_GENERATION`,
      );
    }
  }

  // 2. Spec resolver & kW <-> KS & CO2 assertions
  assert.equal(specResolver.kwToKs(110), 150);
  assert.equal(specResolver.ksToKw(150), 110);

  const golf3 = specResolver.resolveVehicleSpecs({ make: "Volkswagen", model: "Golf", variant: "1.9 TDI", date: "1995-05" });
  assert.equal(golf3.fuel, "Dizel");
  assert.equal(golf3.cc, 1896);
  assert.ok(golf3.co2 > 130, `Expected Golf 3 CO2 > 130, got ${golf3.co2}`);

  const bydSeal = specResolver.resolveVehicleSpecs({ make: "BYD", model: "Seal", variant: "AWD Excellence", date: "2025-03" });
  assert.equal(bydSeal.fuel, "Električni");
  assert.equal(bydSeal.cc, 0);
  assert.equal(bydSeal.co2, 0);

  const bmwPhev = specResolver.resolveVehicleSpecs({ make: "BMW", model: "Serija 3", variant: "330e", date: "2024-02" });
  assert.equal(bmwPhev.fuel, "Plug-in hibrid");
  assert.ok(bmwPhev.co2 >= 22 && bmwPhev.co2 <= 49, `Unexpected PHEV CO2: ${bmwPhev.co2}`);

  const corollaHybrid = specResolver.resolveVehicleSpecs({ make: "Toyota", model: "Corolla", variant: "1.8 Hybrid", date: "2023-04" });
  assert.equal(corollaHybrid.fuel, "Hibrid");
  assert.ok(corollaHybrid.co2 >= 88 && corollaHybrid.co2 <= 128, `Unexpected hybrid CO2: ${corollaHybrid.co2}`);

  const daciaLpg = specResolver.resolveVehicleSpecs({ make: "Dacia", model: "Sandero", variant: "ECO-G 100", date: "2024-06" });
  assert.equal(daciaLpg.fuel, "LPG");
  assert.equal(daciaLpg.cc, 999);

  const customEngine = specResolver.resolveVehicleSpecs({ make: "Mazda", model: "CX-60", variant: "2.2 Skyactiv-D 110 kW", date: "2023-01" });
  assert.equal(customEngine.fuel, "Dizel");
  assert.equal(customEngine.kw, 110);
  assert.equal(customEngine.cc, 2191);

  // 3. Era-, body-, and brand-aware equipment matrix assertions
  const astra1995 = equipCatalog.equipmentFor({ make: "Opel", model: "Astra", generation: "F", date: "1995-04", fuel: "Benzin" });
  assert.ok(!astra1995.some(i => /Apple CarPlay|Matrix LED|Virtual Cockpit/i.test(i.label)), "1995 Astra should not have modern ADAS/CarPlay");
  assert.ok(astra1995.some(i => /Servo upravljač|Klima-uređaj/i.test(i.label)), "1995 Astra should have era-authentic equipment");

  const seal2025 = equipCatalog.equipmentFor({ make: "BYD", model: "Seal", date: "2025-02", fuel: "Električni" });
  assert.ok(seal2025.some(i => /Type 2/i.test(i.label)), "BYD Seal EV should include Type 2 charging cable");

  const ranger = equipCatalog.equipmentFor({ make: "Ford", model: "Ranger", date: "2022-05", fuel: "Dizel", bodyType: "Pick-up" });
  assert.ok(ranger.some(i => /Pokrov tovarnog prostora|Zaštitna obloga sanduka/i.test(i.label)), "Ranger pickup should include pickup/tow options");

  const sprinter = equipCatalog.equipmentFor({ make: "Mercedes-Benz", model: "Sprinter", date: "2021-03", fuel: "Dizel", bodyType: "Kombi / Dostavno" });
  assert.ok(sprinter.some(i => /Klizna vrata|Pregrada prtljažnog prostora/i.test(i.label)), "Sprinter van should include van equipment");

  // 4. AI Photo scanner context/era safety
  const yugoScan = await photoScanner.scanPhotosForEquipment({
    photos: [{ src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", name: "eksterijer.jpg" }],
    vehicle: { make: "Zastava / Yugo", model: "Koral", date: "1991-06", fuel: "Benzin" },
  });
  assert.ok(!yugoScan.detected.some(d => /Matrix|CarPlay|Digitalni/i.test(d.label)), "1991 Yugo scan must not suggest modern electronics");

  // 5. Universal price engine coverage
  const yugoVal = priceEngine.evaluateMarketPrice({ make: "Zastava / Yugo", model: "Koral", year: 1995, km: 145000, kw: 40, fuel: "Benzin", gear: "Ručni" });
  assert.ok(yugoVal.medianMarketPrice >= 500 && yugoVal.medianMarketPrice <= 4000, `Unexpected Yugo price: ${yugoVal.medianMarketPrice}`);

  const bydVal = priceEngine.evaluateMarketPrice({ make: "BYD", model: "Atto 3", year: 2024, km: 18000, kw: 150, fuel: "Električni", gear: "Automatski" });
  assert.ok(bydVal.medianMarketPrice >= 20000 && bydVal.medianMarketPrice <= 45000, `Unexpected BYD Atto 3 price: ${bydVal.medianMarketPrice}`);
  assert.equal(bydVal.estimatedPpmvEur, 0, "EV PPMV should be 0");

  const sprinterVal = priceEngine.evaluateMarketPrice({ make: "Mercedes-Benz", model: "Sprinter", bodyType: "Kombi / Dostavno", year: 2021, km: 120000, kw: 125, fuel: "Dizel", gear: "Ručni" });
  assert.ok(sprinterVal.medianMarketPrice >= 20000 && sprinterVal.medianMarketPrice <= 55000, `Unexpected Sprinter price: ${sprinterVal.medianMarketPrice}`);

  const ferrariVal = priceEngine.evaluateMarketPrice({ make: "Ferrari", model: "296 GTB", year: 2024, km: 4000, kw: 610, fuel: "Plug-in hibrid", gear: "Automatski" });
  assert.ok(ferrariVal.medianMarketPrice >= 180000, `Unexpected Ferrari 296 GTB price: ${ferrariVal.medianMarketPrice}`);

  console.log(`PASS: ${makes.length} brands, ${totalModels} models, specs, CO2, era/body equipment, scanner, and valuations verified.`);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

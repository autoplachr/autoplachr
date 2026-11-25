import { cp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import ts from "typescript";
import { subprocess } from "./subprocess.mjs";

process.env.AUTOPLAC_STATIC_EXPORT = "1";
await subprocess(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
const htmlPages = (await readdir("out")).filter(file => file.endsWith(".html") && file !== "404.html");
for (const page of htmlPages) {
  const html = await readFile("out/" + page, "utf8");
  if (![...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].some(([,css]) =>
    css.includes("--nav-height") && css.includes(".hero-search") && css.includes(".dark"))) {
    throw new Error("Missing inline marketplace stylesheet in " + page);
  }
}
await rm("dist/client", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await cp("out", "dist/client", { recursive: true });
for (const name of ["croatia-locations", "working-hours", "profile-validation"]) {
  const source = await readFile("src/data/" + name + ".ts", "utf8");
  const { outputText } = ts.transpileModule(source, {compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext }});
  await writeFile("dist/server/" + name + ".mjs",outputText);
}
for (const name of ["rate-limit", "sanitize"]) {
  const source = await readFile("src/lib/" + name + ".ts", "utf8");
  const { outputText } = ts.transpileModule(source, {compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext }});
  await writeFile("dist/server/" + name + ".mjs",outputText);
}
const api = await readFile("worker/api.mjs","utf8");
await writeFile("dist/server/api.mjs", api.replace(/\.\.\/src\/(?:data|lib)\/([a-z-]+)\.ts/g, "./$1.mjs"));
await cp("worker/analyze-listing.mjs", "dist/server/analyze-listing.mjs");
await cp("worker/index.mjs", "dist/server/index.js");
await writeFile("dist/server/wrangler.json", JSON.stringify({
  main: "index.js", name: "autoplac", compatibility_date: "2026-01-01",
  assets: { directory: "../client", binding: "ASSETS", run_worker_first: ["/api/*", "/uploads/imported/*", "/racun", "/prijava", "/registracija", "/predaj-oglas", "/procjena-cijene", "/ppmv-kalkulator", "/autokuce", "/autokuce/*", "/oglas/*", "/uvjeti-koristenja", "/privatnost", "/kolacici", "/dsa-prijava", "/auth/callback"] },
  d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000" }]
}));

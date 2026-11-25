import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { subprocess } from "./subprocess.mjs";

await subprocess(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
await rm("dist/client", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await cp("out", "dist/client", { recursive: true });
await cp("worker/api.mjs", "dist/server/api.mjs");
await cp("worker/index.mjs", "dist/server/index.js");
await writeFile("dist/server/wrangler.json", JSON.stringify({
  main: "index.js", name: "sasija", compatibility_date: "2026-01-01",
  assets: { directory: "../client", binding: "ASSETS", run_worker_first: ["/api/*", "/racun", "/prijava", "/registracija", "/uvjeti-koristenja", "/privatnost", "/kolacici", "/dsa-prijava"] },
  d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000" }]
}));

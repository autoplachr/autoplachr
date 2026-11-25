import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.mjs";

const publicShare = process.env.AUTOPLAC_SHARE === "1";
if (!publicShare && !process.env.AUTOPLAC_PREVIEW_DB) await mkdir(".local-data", { recursive: true });
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
  if (publicShare && /^[a-z0-9-]+\.trycloudflare\.com$/i.test(host)) return "https://" + host;
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host) ? "http://" + host : origin;
}
createServer(async (req, res) => {
  try {
    if (publicShare && req.url === "/__autoplac_share" && req.method === "GET") {
      res.writeHead(200, {"content-type":"text/plain", "cache-control":"no-store"});res.end("autoplac-share-preview-v1");return;
    }
    let chunks = [], size=0;
    for await (const chunk of req) {
      size+=chunk.length;
      if (size>1800000) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    const request = new Request(new URL(req.url,requestOrigin(req.headers)), {method:req.method, headers:req.headers, body:chunks.length ? Buffer.concat(chunks) : undefined});
    const result = await worker.fetch(request,publicShare ? { DB, ASSETS } : { ...process.env, DB, ASSETS });
    res.writeHead(result.status,Object.fromEntries(result.headers));
    res.end(req.method === "HEAD" ? undefined : Buffer.from(await result.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end(); }
}).listen(port,bind,()=>console.log("Local: "+origin));

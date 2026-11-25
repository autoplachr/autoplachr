import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const privateNetworks = new BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) privateNetworks.addSubnet(prefix, bits);

export async function fetchClassifieds(input: string, maximumBytes: number, signal: AbortSignal, image = false) {
  let url = new URL(input);
  for (let redirects = 0; redirects < 5; redirects++) {
    signal.throwIfAborted();
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.href.length > 2048 ||
        !url.hostname.includes(".") || url.hostname.startsWith("[") || isIP(url.hostname)) throw new Error("Unesite javnu HTTPS poveznicu.");
    const addresses = await lookup(url.hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(({ address }) => privateNetworks.check(address))) throw new Error("Unesite javnu HTTPS poveznicu.");
    const address = addresses[0].address;
    const result = await new Promise<{ status: number; type: string; location?: string; body: Buffer }>((resolve, reject) => {
      const req = request(url, {
        signal, family: 4, agent: false,
        lookup: (_hostname, _options, callback) => callback(null, address, 4),
        headers: {
          "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Accept: image ? "image/avif,image/webp,image/png,image/jpeg,image/*" : "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.5",
          Referer: "https://www.google.hr/",
          "Accept-Encoding": "identity",
        },
      }, response => {
        const status = response.statusCode ?? 502, type = String(response.headers["content-type"] ?? ""), location = response.headers.location;
        if (status !== 200) {
          response.destroy();
          resolve({ status, type, location, body: Buffer.alloc(0) });
          return;
        }
        let length = 0;
        const chunks: Buffer[] = [];
        response.on("error", reject);
        response.on("data", (chunk: Buffer) => {
          length += chunk.length;
          if (length > maximumBytes) response.destroy(new Error("Datoteka je prevelika."));
          else chunks.push(chunk);
        });
        response.on("end", () => resolve({ status, type, body: Buffer.concat(chunks) }));
      });
      req.on("error", reject);
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      url = new URL(result.location, url);
      continue;
    }
    return { ...result, url: url.href };
  }
  throw new Error("Previše preusmjeravanja.");
}


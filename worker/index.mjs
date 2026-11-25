import { api } from "./api.mjs";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "X-XSS-Protection": "1; mode=block",
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, val] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, val);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function dealershipFeed(url, env) {
  const sources = (env.DEALERSHIP_FEED_HOSTS ?? "").toLowerCase().split(",").map(host => host.trim()).filter(Boolean);
  let feed;
  try { feed = new URL(url.searchParams.get("url") ?? ""); }
  catch { return new Response(null, { status: 400 }); }
  if (feed.protocol !== "https:" || feed.port || feed.username || feed.password || !sources.includes(feed.hostname)) {
    return new Response(null, { status: 403 });
  }
  try {
    const response = await fetch(feed, { redirect: "error", signal: AbortSignal.timeout(12000) });
    const limit = 8 * 1024 * 1024;
    if (!response.ok || !response.body) return new Response(null, { status: 502 });
    if (Number(response.headers.get("content-length")) > limit) return new Response(null, { status: 413 });
    let bytes = 0;
    const capped = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > limit) controller.error(new Error("Feed exceeds 8 MB."));
        else controller.enqueue(chunk);
      },
    }));
    return new Response(capped, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 502 });
  }
}
async function proxyClassifieds(request, env, pathname) {
  const absent = () => Response.json({ message: "Uvoz oglasa trenutno nije dostupan." }, { status: 503 });
  if (!env.CLASSIFIEDS_IMPORT_ORIGIN) return absent();
  const isImport = pathname === "/api/import-url";
  if (isImport && (request.method !== "POST" || request.headers.get("origin") !== new URL(request.url).origin ||
      !request.headers.get("content-type")?.startsWith("application/json"))) {
    return Response.json({ message: "Neispravan zahtjev." }, { status: 403 });
  }
  try {
    const destination = new URL(pathname, env.CLASSIFIEDS_IMPORT_ORIGIN);
    if (destination.protocol !== "https:" || destination.origin === new URL(request.url).origin) return absent();
    return await fetch(destination, {
      method: request.method,
      body: isImport ? request.body : undefined,
      headers: isImport ? { "content-type": "application/json", origin: destination.origin } : {},
      redirect: "error",
      signal: AbortSignal.timeout(65000),
    });
  } catch { return absent(); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const importedImage = /^\/uploads\/imported\/[a-z0-9-]+\/[a-f0-9]{24}\.webp$/.test(url.pathname);
    if (url.pathname === "/api/import-url" || (env.CLASSIFIEDS_IMPORT_ORIGIN && importedImage && ["GET", "HEAD"].includes(request.method))) {
      return withSecurityHeaders(await proxyClassifieds(request, env, url.pathname));
    }
    if (url.pathname === "/api/dealership-feed" && request.method === "GET") return withSecurityHeaders(await dealershipFeed(url, env));
    if (url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await api(request, env));
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !["GET","HEAD"].includes(request.method)) {
      return withSecurityHeaders(response);
    }
    const shell = /^\/(?:racun|prijava|registracija|predaj-oglas|procjena-cijene|ppmv-kalkulator|autokuce(?:\/[a-z0-9-]+)?|oglas(?:\/[a-z0-9-]+)?|uvjeti-koristenja|privatnost|kolacici|dsa-prijava|auth\/callback)\/?$/;
    const finalResponse = shell.test(url.pathname)
      ? await env.ASSETS.fetch(new Request(new URL("/", url), request))
      : response;
    return withSecurityHeaders(finalResponse);
  },
};

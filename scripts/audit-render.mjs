// 10-agent audit: rendered-output evidence collector.
// Headless Chrome via playwright-core, hard-exits so it can never hang on Windows.
// Usage: node scripts/audit-render.mjs   (preview must be running on port 4323)
// Output: .tmp-audit/render-report.json + .tmp-audit/screens/*.png
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(join(process.env.PLAYWRIGHT_CORE_DIR ?? join(tmpdir(), "autoplac-visual"), "noop.js"));
const { chromium } = require("playwright-core");

const watchdog = setTimeout(() => { console.error("audit-render: watchdog timeout"); process.exit(2); }, 280_000);
const base = process.env.AUDIT_BASE ?? "http://localhost:4323";
const executablePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = ".tmp-audit";
await mkdir(join(OUT, "screens"), { recursive: true });

const BANNED = ["lorem ipsum", "todo", "fixme", "example.com", "test@", "555-", "00000", "uskoro",
  "sponzorirano", "auto osiguranje", "usporedi police", "otp leasing", "erste", "porsche leasing",
  "placeholders", "dummy", "lorem", "coming soon", "undefined", "[object object]"];

// Deep-interaction routes captured at both viewports.
const CORE = [
  ["home", "/"],
  ["catalog", "/rabljena-vozila"],
  ["catalog-bmw", "/rabljena-vozila?marka=bmw"],
  ["detail-bmw", "/oglas/bmw-320d-g20-m-sport-xdrive-2021-zagreb-g20"],
  ["detail-skoda", "/oglas/skoda-octavia-rs-2-0-tsi-2022-varazdin-octavia"],
  ["detail-porsche", "/oglas/porsche-macan-s-2020-zagreb-macan"],
  ["autokuce", "/autokuce"],
  ["dealer", "/autokuce/auto-centar-horvat"],
  ["ppmv", "/ppmv-kalkulator"],
  ["procjena", "/procjena-cijene"],
  ["predaj", "/predaj-oglas"],
  ["racun", "/racun"],
  ["grad-zagreb", "/grad/zagreb"],
  ["uvjeti", "/uvjeti-koristenja"],
  ["privatnost", "/privatnost"],
  ["kolacici", "/kolacici"],
  ["legacy-redirect", "/?oglas=bmw-320d-g20-m-sport-xdrive-2021-zagreb-g20"],
];
const VIEWPORTS = [["desktop", 1440, 900], ["mobile", 390, 844]];
const report = { base, generatedAt: new Date().toISOString(), core: {}, sitemap: {}, summary: {} };

const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
try {
  // ---------- Pass 1: sitemap inventory (status only, desktop) ----------
  const smResponse = await fetch(base + "/sitemap.xml");
  const sitemapXml = await smResponse.text();
  const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const sitemapPaths = sitemapUrls.map(u => { try { return new URL(u).pathname + new URL(u).search; } catch { return u; } });
  report.summary.sitemapCount = sitemapPaths.length;

  const probeContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await probeContext.addInitScript(() => { try { localStorage.setItem("autoplac_cookie_consent_v1", JSON.stringify({ analytics: false, marketing: false })); } catch {} });
  const probe = await probeContext.newPage();
  for (const path of sitemapPaths) {
    const entry = { status: 0, ok: false, title: "", jsonLdTypes: [], errors: [] };
    try {
      const response = await probe.goto(base + path, { waitUntil: "domcontentloaded", timeout: 12_000 });
      entry.status = response?.status() ?? 0;
      entry.ok = entry.status >= 200 && entry.status < 400;
      entry.title = await probe.title();
      entry.url = probe.url();
      const ld = await probe.locator('script[type="application/ld+json"]').allTextContents().catch(() => []);
      entry.jsonLdTypes = ld.flatMap(text => { try { const j = JSON.parse(text); return (Array.isArray(j) ? j : [j]).map(x => x["@type"]).filter(Boolean); } catch { return ["INVALID_JSONLD"]; } });
    } catch (error) { entry.errors.push(String(error.message || error)); }
    report.sitemap[path] = entry;
  }
  await probeContext.close();

  // ---------- Pass 2: core routes, detailed, both viewports ----------
  for (const [device, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(() => { try { localStorage.setItem("autoplac_cookie_consent_v1", JSON.stringify({ analytics: false, marketing: false })); } catch {} });

    for (const [name, path] of CORE) {
      // Fresh page per route: a failed navigation must not poison the next route.
      const page = await context.newPage();
      const consoleErrors = [], pageErrors = [], failedRequests = [], externalRequests = [];
      page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
      page.on("pageerror", err => pageErrors.push(String(err.message || err)));
      page.on("requestfailed", req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText }));
      page.on("response", res => { if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() }); });
      page.on("request", req => { const u = req.url(); if (u.startsWith("http") && !u.startsWith(base) && !u.startsWith("http://localhost") && !u.startsWith("http://127.0.0.1")) externalRequests.push(u); });
      const data = { path, status: 0, finalUrl: "", title: "", metaDescription: "", canonical: "", og: {}, twitter: {}, jsonLd: [], consoleErrors: [], pageErrors: [], failedRequests: [], externalRequests: [], links: [], deadLinks: [], images: {}, overflow: { horizontal: false, scrollWidth: 0, innerWidth: 0, offenders: [] }, smallTargets: [], bannedHits: [], textSample: "", tapTargets: 0, stickyBottomBar: false, listingCount: null };
      try {
        const response = await page.goto(base + path, { waitUntil: "load", timeout: 20_000 });
        data.status = response?.status() ?? 0;
        await page.waitForTimeout(900);
        data.finalUrl = page.url();
        data.title = await page.title();
        const meta = await page.evaluate((BANNED) => {
          const get = sel => document.querySelector(sel)?.getAttribute("content") || "";
          const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return { INVALID: s.textContent.slice(0, 120) }; } });
          const imgs = [...document.images];
          const dead = [];
          for (const a of document.querySelectorAll("a[href]")) {
            const href = a.getAttribute("href");
            if (!href || href === "#" || href.startsWith("javascript:")) dead.push({ href, text: (a.textContent || "").trim().slice(0, 60) });
          }
          const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src);
          const missingAlt = imgs.filter(i => !i.hasAttribute("alt")).length;
          const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
          const offenders = sw > iw ? [...document.querySelectorAll("body *")].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > iw + 1; }).slice(0, 12).map(el => ({ tag: el.tagName, cls: (el.className && String(el.className)).slice(0, 90), right: Math.round(el.getBoundingClientRect().right) })) : [];
          const small = [...document.querySelectorAll("a,button,[role=button],input,select,[tabindex]:not([tabindex='-1'])")].filter(el => {
            const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && (r.width < 44 || r.height < 44);
          }).slice(0, 20).map(el => ({ tag: el.tagName, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
          const text = (document.body.innerText || "").slice(0, 60000);
          const bannedHits = BANNED.filter(b => text.toLowerCase().includes(b));
          const sticky = !!document.querySelector(".mobile-detail-actions") && getComputedStyle(document.querySelector(".mobile-detail-actions")).position === "fixed";
          const countMatch = text.match(/(\d+)\s*(?:vozila|oglasa|rezultata|vozil|oglasi)/i);
          return {
            metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
            og: Object.fromEntries(["og:title", "og:description", "og:image", "og:type", "og:url"].map(k => [k, get(`meta[property="${k}"]`)])),
            twitter: Object.fromEntries(["twitter:card", "twitter:title", "twitter:description", "twitter:image"].map(k => [k, get(`meta[name="${k}"]`)])),
            jsonLd: ld, imgs: { total: imgs.length, broken, missingAlt, oversized: imgs.filter(i => i.naturalWidth > 2500).length },
            dead, overflow: { horizontal: sw > iw, scrollWidth: sw, innerWidth: iw, offenders }, smallTargets: small,
            text: text.slice(0, 1400), bannedHits, sticky, listingCount: countMatch ? Number(countMatch[1]) : null,
          };
        }, BANNED);
        Object.assign(data, { metaDescription: meta.metaDescription, canonical: meta.canonical, og: meta.og, twitter: meta.twitter, jsonLd: meta.jsonLd, images: { total: meta.imgs.total, broken: meta.imgs.broken, missingAlt: meta.imgs.missingAlt, oversized: meta.imgs.oversized }, deadLinks: meta.dead, overflow: meta.overflow, smallTargets: meta.smallTargets, bannedHits: meta.bannedHits, textSample: meta.text, stickyBottomBar: meta.sticky, listingCount: meta.listingCount });
        data.links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50) })));
        await page.screenshot({ path: join(OUT, "screens", `${name}-${device}.png`), fullPage: true });
      } catch (error) { data.loadError = String(error.message || error); }
      data.consoleErrors = [...consoleErrors]; data.pageErrors = [...pageErrors];
      data.failedRequests = failedRequests.filter(r => { try { return new URL(r.url).host === new URL(base).host; } catch { return false; } });
      data.externalRequests = [...new Set(externalRequests)].slice(0, 40);
      report.core[`${name}::${device}`] = data;
      await page.close();
    }
    await context.close();
  }

  // ---------- Summary ----------
  const coreVals = Object.values(report.core);
  report.summary.coreRoutes = CORE.length * VIEWPORTS.length;
  report.summary.sitemapNonOk = Object.entries(report.sitemap).filter(([, v]) => !v.ok).map(([k, v]) => ({ path: k, status: v.status }));
  report.summary.totalConsoleErrors = coreVals.reduce((n, v) => n + v.consoleErrors.length, 0);
  report.summary.totalPageErrors = coreVals.reduce((n, v) => n + v.pageErrors.length, 0);
  report.summary.totalFailedRequests = coreVals.reduce((n, v) => n + v.failedRequests.length, 0);
  report.summary.totalBrokenImages = coreVals.reduce((n, v) => n + (v.images?.broken?.length ?? 0), 0);
  report.summary.totalDeadLinks = coreVals.reduce((n, v) => n + (v.deadLinks?.length ?? 0), 0);
  report.summary.horizontalOverflowRoutes = coreVals.filter(v => v.overflow?.horizontal).map(v => `${v.path} (${v.overflow.scrollWidth}>${v.overflow.innerWidth})`);
  report.summary.bannedHits = coreVals.filter(v => (v.bannedHits?.length ?? 0) > 0).map(v => ({ path: v.path, hits: v.bannedHits }));
  await writeFile(join(OUT, "render-report.json"), JSON.stringify(report, null, 2));
  console.log("audit-render summary:", JSON.stringify(report.summary, null, 2));
} catch (error) {
  console.error("audit-render fatal:", error?.stack || error);
  await writeFile(join(OUT, "fatal.txt"), String(error?.stack || error));
} finally {
  await browser.close();
  clearTimeout(watchdog);
  process.exit(0);
}

// Standalone visual check: headless Chrome screenshots of key routes on the local preview.
// Usage: node scripts/visual-check.mjs  (preview must be running on port 4323)
// Hard-exits after 90 s so it can never hang the terminal on Windows.
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";

// playwright-core is not a project dependency; load it from PLAYWRIGHT_CORE_DIR (default: %TEMP%/autoplac-visual).
const require = createRequire(join(process.env.PLAYWRIGHT_CORE_DIR ?? join(tmpdir(), "autoplac-visual"), "noop.js"));
const { chromium } = require("playwright-core");

const watchdog = setTimeout(() => { console.error("visual-check: watchdog timeout"); process.exit(2); }, 90_000);
const base = process.env.VISUAL_BASE ?? "http://localhost:4323";
const executablePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const routes = (process.env.VISUAL_ROUTES ?? "home=/,detail=/oglas/skoda-octavia-rs-2-0-tsi-2022-varazdin-octavia,racun=/racun")
  .split(",").map(entry => entry.split("="));
const viewports = [["desktop", 1440, 900], ["mobile", 390, 844]];
const fullPage = process.env.VISUAL_FULL !== "0";

await mkdir(".tmp-visual-check", { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
try {
  for (const [device, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      try { localStorage.setItem("autoplac_cookie_consent_v1", JSON.stringify({ analytics: false, marketing: false })); } catch {}
    });
    const page = await context.newPage();
    for (const [name, path] of routes) {
      await page.goto(base + path, { waitUntil: "load", timeout: 20_000 });
      await page.waitForTimeout(1500);
      if (process.env.VISUAL_SCROLL) await page.evaluate(selector => document.querySelector(selector)?.scrollIntoView(), process.env.VISUAL_SCROLL);
      const file = `.tmp-visual-check/${name}-${device}.png`;
      await page.screenshot({ path: file, fullPage });
      console.log("saved", file);
    }
    await context.close();
  }
} finally {
  await browser.close();
  clearTimeout(watchdog);
  process.exit(0);
}

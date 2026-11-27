export type CookieChoice = { analytics: boolean; marketing: boolean };

const consentKey = "autoplac_cookie_consent_v1";
const legacyKeys = ["autoplac.cookies.v1", "autoplac_cookie_consent"];
export const consentUpdated = "autoplac:cookies-updated";

export function readCookieConsent(): CookieChoice | null {
  if (typeof window === "undefined") return null;
  try {
    for (const key of [consentKey, ...legacyKeys]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let saved: unknown;
      try { saved = JSON.parse(raw); } catch { continue; }
      if (!saved || typeof saved !== "object" || !("analytics" in saved) || !("marketing" in saved)
        || typeof saved.analytics !== "boolean" || typeof saved.marketing !== "boolean") continue;
      const choice = { analytics: saved.analytics, marketing: saved.marketing };
      if (key !== consentKey) localStorage.setItem(consentKey, JSON.stringify(choice));
      for (const legacy of legacyKeys) localStorage.removeItem(legacy);
      return choice;
    }
  } catch { /* Storage is unavailable. */ }
  return null;
}

export function saveCookieConsent(choice: CookieChoice) {
  try {
    localStorage.setItem(consentKey, JSON.stringify(choice));
    for (const legacy of legacyKeys) localStorage.removeItem(legacy);
    window.dispatchEvent(new Event(consentUpdated));
  } catch { /* Storage is unavailable. */ }
}

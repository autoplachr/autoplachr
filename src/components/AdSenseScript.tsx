"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";
const CONSENT_KEY = "autoplac.cookies.v1";

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY) || localStorage.getItem("autoplac_cookie_consent");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { marketing?: boolean };
    return parsed?.marketing === true;
  } catch {
    return false;
  }
}

export function AdSenseScript() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(Boolean(ADSENSE_CLIENT_ID) && hasMarketingConsent());
    sync();
    window.addEventListener("autoplac:cookies-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("autoplac:cookies-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!allowed || !ADSENSE_CLIENT_ID) return null;

  return (
    <Script
      id="autoplac-adsense-sdk"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT_ID)}`}
    />
  );
}

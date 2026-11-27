"use client";

import { consentUpdated, readCookieConsent } from "../lib/cookie-consent";
import Script from "next/script";
import { useEffect, useState } from "react";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";


export function AdSenseScript() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(Boolean(ADSENSE_CLIENT_ID) && (readCookieConsent()?.marketing === true));
    sync();
    window.addEventListener(consentUpdated, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(consentUpdated, sync);
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

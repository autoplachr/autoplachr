export function safeAuthNext(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith("/") || /^\/[/\\]/.test(value) || /[\\\u0000-\u0020\u007f]/.test(value)) return;
  try {
    const decoded = decodeURIComponent(value);
    if (/^\/[/\\]/.test(decoded) || /[\\\u0000-\u001f\u007f]/.test(decoded)) return;
    const url = new URL(value, "https://autoplac.hr");
    if (url.origin === "https://autoplac.hr" && !/^\/(?:prijava|registracija|auth)(?:\/|$)/.test(url.pathname)) {
      return url.pathname + url.search + url.hash;
    }
  } catch { /* malformed redirect */ }
}

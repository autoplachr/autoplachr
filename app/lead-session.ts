export function leadSession() {
  const key = "autoplac.lead-session";
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

export function contactMetadata() {
  let source = "";
  try { if (document.referrer) source = new URL(document.referrer).origin; } catch { /* No referrer. */ }
  return { session: leadSession(), source, device: matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop" };
}


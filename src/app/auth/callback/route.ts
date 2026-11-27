import { NextResponse } from "next/server";
import { getSiteOrigin } from "../../../lib/site-origin";
import { safeAuthNext } from "../../../lib/auth-next";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteOrigin = getSiteOrigin();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeAuthNext(next) ?? "/racun";

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, siteOrigin));
    }
  }

  return NextResponse.redirect(new URL("/prijava?error=oauth", siteOrigin));
}

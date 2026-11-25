import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../src/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await getSupabaseServerClient();
  const code = url.searchParams.get("code");
  const target = url.searchParams.get("next") === "/auth/recovery" ? "/auth/recovery" : "/racun";
  if (auth && code) {
    const { error } = await auth.auth.exchangeCodeForSession(code);
    if (!error) {
      await auth.rpc("ensure_my_profile");
      return NextResponse.redirect(new URL(target, url));
    }
  }
  return NextResponse.redirect(new URL("/prijava?error=oauth", url));
}

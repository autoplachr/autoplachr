import { NextResponse } from "next/server";
import { getSiteOrigin } from "../../../src/lib/site-origin";
import { getSupabaseServerClient } from "../../../src/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteOrigin = getSiteOrigin();
  const auth = await getSupabaseServerClient();
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  if (auth && code) {
    const { data, error } = await auth.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error) {
      await auth.rpc("ensure_my_profile");
      const target = "redirectType" in data && data.redirectType === "recovery" ? "/auth/recovery" : "/racun";
      return NextResponse.redirect(new URL(target, siteOrigin));
    }
  }
  return NextResponse.redirect(new URL("/prijava?error=oauth", siteOrigin));
}

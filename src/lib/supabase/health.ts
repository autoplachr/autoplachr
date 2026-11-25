import { createClient } from "@supabase/supabase-js";

export async function supabaseHealth(env: NodeJS.ProcessEnv) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const headers = { "cache-control": "no-store" };
  if (!url || !key) return Response.json({ ok: false, database: "unconfigured" }, { status: 503, headers });
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
    const { error } = await client.from("listings").select("id").limit(1);
    if (!error) return Response.json({ ok: true, database: "reachable" }, { headers });
  } catch { /* Report dependency failure without returning connection details. */ }
  return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers });
}

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

if (typeof window !== "undefined") {
  throw new Error("Server-only module: src/lib/supabase/server.ts cannot run in browser bundles.");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseServerConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseServerConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies during render; route handlers/middleware handle writes.
        }
      },
    },
  });
}

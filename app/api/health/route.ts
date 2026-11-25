import { supabaseHealth } from "../../../src/lib/supabase/health";

export const dynamic = "force-dynamic";
export function GET() {
  return supabaseHealth(process.env);
}

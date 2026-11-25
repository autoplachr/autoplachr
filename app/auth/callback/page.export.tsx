"use client";

import { useEffect, useState } from "react";
import { getSiteOrigin } from "../../../src/lib/site-origin";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../src/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Dovršavanje prijave…");

  useEffect(() => {
    let active = true;
    async function finalize() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const flowId = params.get("sb_flow_id");
      const siteOrigin = getSiteOrigin();
      let target = "/racun";

      if (!isSupabaseConfigured) {
        window.location.replace(new URL(target, siteOrigin).href);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        window.location.replace("/prijava");
        return;
      }

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
          if (error) throw error;
          if ("redirectType" in data && data.redirectType === "recovery") target = "/auth/recovery";
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw new Error("Missing session");
        }
        if (active) window.location.replace(new URL(target, siteOrigin).href);
      } catch {
        if (active) {
          setStatus("Prijava nije uspjela. Preusmjeravanje na prijavu…");
          setTimeout(() => window.location.replace(new URL("/prijava?error=oauth", siteOrigin).href), 900);
        }
      }
    }
    void finalize();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="shell account-shell">
      <section className="detail-panel auth-card">
        <h1>AUTOPLAC.HR</h1>
        <p className="mt-2 text-[var(--muted)]">{status}</p>
      </section>
    </main>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../../src/lib/supabase/client";

export default function PasswordRecoveryPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusy(true);
    setStatus("");
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      window.location.replace("/racun");
    } catch {
      setStatus("Lozinka nije promijenjena. Zatražite novu poveznicu za poništavanje ili pokušajte s drugom lozinkom.");
    } finally { setBusy(false); }
  }

  return <main className="shell account-shell">
    <section className="detail-panel auth-card">
      <h1>Postavite novu lozinku</h1>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>Nova lozinka</span><input name="password" type="password"
          autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        {status && <p role="alert">{status}</p>}
        <button className="btn primary" disabled={busy}>Spremi lozinku</button>
      </form>
    </section>
  </main>;
}

import Link from "next/link";

export default function NotFound() {
  return <main className="shell account-shell">
    <section className="detail-panel form-stack">
      <h1 className="text-xl font-bold">404 · Stranica nije pronađena</h1>
      <nav className="account-actions" aria-label="Povratak na glavne stranice">
        <Link className="btn primary min-h-11" href="/#svi-oglasi">Rabljena vozila</Link>
        <Link className="btn secondary min-h-11" href="/autokuce">Autokuće</Link>
        <Link className="btn quiet min-h-11" href="/">Naslovnica</Link>
      </nav>
    </section>
  </main>;
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { euro, number } from "./catalog";
import { api, type Account, type ListingLead, type OwnedListing, type SellerAnalytics } from "./account-api";
import { VehiclePhoto } from "./ui";

export const emptyAnalytics: SellerAnalytics = { metrics: [], activity: [], inquiries: [], unread: 0 };
const totals = (data: SellerAnalytics) => data.metrics.reduce((sum, item) => ({
  views: sum.views + item.views, phone: sum.phone + item.phone, whatsapp: sum.whatsapp + item.whatsapp,
  messages: sum.messages + item.messages,
}), { views: 0, phone: 0, whatsapp: 0, messages: 0 });

function stamp(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "medium" });
  const time = new Intl.DateTimeFormat("hr-HR", { timeZone: "Europe/Zagreb", hour: "2-digit", minute: "2-digit" });
  return (day.format(date) === day.format(new Date()) ? "Danas" : day.format(date)) + " u " + time.format(date);
}

export function AnalyticsOverview({ data, account, open, onEdit, onSheet, onPause, onDelete, onManage }: {
  data: SellerAnalytics; account: Account; open: (id: string) => void; onEdit: (listing: OwnedListing) => void;
  onSheet: (listing: OwnedListing) => void; onPause: (listing: OwnedListing) => void; onDelete: (listing: OwnedListing) => void; onManage: () => void;
}) {
  const { views, phone, whatsapp, messages } = totals(data);
  const listings = new Map(account.listings.map(item => [item.id, item]));
  const metrics = new Map(data.metrics.map(item => [item.listingId, item]));
  const active = account.listings.filter(item => item.status === "active");
  return <div className="seller-dashboard">
    <div className="seller-kpis">
      {[
        ["Ukupni pregledi (30 dana)", views],
        ["Klikovi na broj telefona", phone],
        ["WhatsApp upiti", whatsapp],
        ["Primljene poruke", messages],
      ].map(([label, total], index) => <section key={label} className="seller-panel seller-kpi">
        <h2>{label}</h2><strong className="tabular">{number(Number(total))}</strong>
        {index === 1 && <span className="seller-kpi-roi">Kontaktni klikovi</span>}
        {index === 3 && <span className="tabular">{number(data.unread)} nepročitano</span>}
      </section>)}
    </div>
    <section className="seller-panel">
      <div className="seller-section-head"><h2>Učinak aktivnih oglasa</h2><button className="btn secondary" type="button" onClick={onManage}>Upravljaj svim oglasima</button></div>
      {active.length ? <div className="seller-table-scroll"><table className="seller-performance tabular">
        <thead><tr>{["Vozilo", "Cijena", "Pregledi", "Pozivi", "WhatsApp", "Poruke", "Konverzija", "Radnje"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{active.map(listing => {
          const metric = metrics.get(listing.id);
          const conversion = metric?.views ? (metric.phone + metric.whatsapp + metric.messages) / metric.views * 100 : null;
          return <tr key={listing.id}>
            <th scope="row"><button className="seller-table-vehicle" type="button" onClick={() => open(listing.id)}>
              <VehiclePhoto photo={listing.photos[0]} alt="" /><span>{listing.title}</span>
            </button></th>
            <td>{euro(listing.price)}</td><td>{number(metric?.views ?? 0)}</td><td>{number(metric?.phone ?? 0)}</td>
            <td>{number(metric?.whatsapp ?? 0)}</td><td>{number(metric?.messages ?? 0)}</td>
            <td>{conversion === null ? "—" : new Intl.NumberFormat("hr-HR", { maximumFractionDigits: 1 }).format(conversion) + " %"}</td>
            <td><div className="seller-table-actions">
              <button className="btn secondary" type="button" onClick={() => onSheet(listing)}>A4 Cjenik za staklo</button>
              <button className="btn quiet" type="button" onClick={() => onEdit(listing)}>Uredi</button>
              <button className="btn quiet" type="button" onClick={() => onPause(listing)}>Pauziraj</button>
              <button className="btn quiet" type="button" onClick={() => onDelete(listing)}>Obriši</button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div> : <p>Trenutačno nemate aktivnih oglasa.</p>}
    </section>
    <section className="seller-panel">
      <h2>Zadnji klikovi na kontakt</h2>
      {data.activity.length ? <ul className="seller-contact-log">{data.activity.map(item => {
        const listing = listings.get(item.listing_id);
        return <li key={item.id}>
          <div><strong>{listing?.title || "Oglas"}</strong><p>{item.event_type === "whatsapp" ? "WhatsApp upit" : "Klik na broj telefona"}</p></div>
          <time className="tabular" dateTime={item.created_at}>{stamp(item.created_at)}</time>
          {listing?.status === "active" && <button className="btn quiet" type="button" onClick={() => open(listing.id)}>Otvori oglas</button>}
        </li>;
      })}</ul> : <p>Još nema klikova na kontakt.</p>}
    </section>
  </div>;
}

export function LeadInbox({ items, listings, reload }: { items: ListingLead[]; listings: OwnedListing[]; reload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = items.find(item => item.id === selectedId);
  function choose(item: ListingLead) {
    setSelectedId(item.id);
    setDraft("");
    setError("");
    if (!item.is_read) void api("lead/reply", { id: item.id }).then(reload)
      .catch(() => setError("Status upita nije ažuriran."));
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("lead/reply", { id: selected.id, reply: draft.trim() });
      setDraft("");
      await reload();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Odgovor nije poslan."); }
    finally { setBusy(false); }
  }
  return <section className="seller-panel">
    <h2>Upiti s oglasa</h2>
    {!items.length ? <p>Još nema upita s oglasa.</p> : <div className="seller-lead-inbox">
      <ul className="seller-lead-list">{items.map(item => {
        const listing = listings.find(vehicle => vehicle.id === item.listing_id);
        return <li key={item.id}>
          <button type="button" aria-pressed={selectedId === item.id} onClick={() => choose(item)}>
            {!item.is_read && <span className="seller-unread-dot" aria-label="Nepročitano" role="img" />}
            <strong>{item.buyer_name}</strong>
            <span>{listing?.title || "Oglas"} {listing && <strong className="tabular seller-lead-price">{euro(listing.price)}</strong>}</span>
            <time className="tabular" dateTime={item.created_at}>{stamp(item.created_at)}</time>
          </button>
          {item.buyer_phone && <a className="seller-lead-phone tabular" href={"tel:" + item.buyer_phone.replace(/[^+\d]/g, "")}>{item.buyer_phone}</a>}
        </li>;
      })}</ul>
      <div className="seller-thread">
        {selected ? <>
          <div className="seller-section-head"><h3>{selected.buyer_name}</h3>
            {selected.buyer_email && <a className="btn quiet" href={"mailto:" + selected.buyer_email}>{selected.buyer_email}</a>}
          </div>
          <div className="seller-thread-history" aria-live="polite">
            <article><time className="tabular" dateTime={selected.created_at}>{stamp(selected.created_at)}</time><p>{selected.message_text}</p></article>
            {selected.replies.map((reply, index) => <article key={reply.created_at + index}>
              <time className="tabular" dateTime={reply.created_at}>Vi · {stamp(reply.created_at)}</time><p>{reply.text}</p>
            </article>)}
          </div>
          <form onSubmit={send} className="form-stack">
            <label className="field"><span>Odgovori kupcu</span><textarea rows={3} placeholder="Odgovori kupcu..." maxLength={1200} required disabled={busy} value={draft} onChange={event => setDraft(event.target.value)} /></label>
            <button type="submit" className="btn primary" disabled={busy || !draft.trim()}>Pošalji odgovor</button>
          </form>
        </> : <p>Odaberite upit za pregled razgovora.</p>}
      </div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

export function TrialReport({ data, name, startedAt }: { data: SellerAnalytics; name: string; startedAt?: string }) {
  const { views, phone } = totals(data);
  const report = name + " · Posljednjih 30 dana: " + number(views) + " pregleda i " + number(phone) + " klikova na telefon.";
  const [copied, setCopied] = useState("");
  const ends = startedAt ? new Date(Date.parse(startedAt) + 30 * 86400000) : null;
  useEffect(() => setCopied(""), [report]);
  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("Izvještaj je kopiran.");
    } catch { setCopied("Označite tekst izvještaja za kopiranje."); }
  }
  return <section className="seller-panel">
    <h2>Izvještaj za kraj probnog roka</h2>
    {ends && <p>Kraj probnog roka: <time className="tabular" dateTime={ends.toISOString()}>{stamp(ends.toISOString())}</time></p>}
    <p className="tabular">{report}</p>
    <button className="btn secondary" type="button" onClick={() => void copyReport()}>Kopiraj izvještaj</button>
    <p role="status">{copied}</p>
  </section>;
}

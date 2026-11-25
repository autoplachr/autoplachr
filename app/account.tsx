"use client";
import { useState, type FormEvent } from "react";
import { api, type Account, type ListingStatus, type OwnedListing, type Profile, type Report } from "./account-api";
import { countyByCity, euro, type Vehicle } from "./catalog";
import { Select, Dialog, VehiclePhoto } from "./ui";

const accountTabs = ["Moji oglasi", "Spremljena vozila", "Postavke profila i sigurnost", "Privatnost i GDPR prava"];
const counties = [...new Set([...Object.values(countyByCity), "Bjelovarsko-bilogorska", "Dubrovačko-neretvanska", "Istarska", "Karlovačka", "Koprivničko-križevačka", "Krapinsko-zagorska", "Ličko-senjska", "Međimurska", "Požeško-slavonska", "Sisačko-moslavačka", "Šibensko-kninska", "Virovitičko-podravska", "Vukovarsko-srijemska", "Zadarska", "Zagrebačka"])]
  .sort((a,b) => a.localeCompare(b,"hr"));
const formData = (event: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget));
function errorText(error: unknown) { return error instanceof Error ? error.message : "Zahtjev nije dovršen."; }

function ProfileFields({ type, profile, registration = false }: { type: Profile["type"]; profile?: Profile; registration?: boolean }) {
  const [name, setName] = useState(profile?.name ?? "");
  const subdomain = name.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55);
  return <div className="form-grid">
    <label className="field span-all"><span>{type === "dealer" ? "Naziv tvrtke" : "Ime i prezime"}</span><input name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} autoComplete={type === "dealer" ? "organization" : "name"}/></label>
    <label className="field"><span>Grad</span><input name="city" defaultValue={profile?.city} required maxLength={100} autoComplete="address-level2"/></label>
    <Select label="Županija" name="county" defaultValue={profile?.county ?? ""} required><option value="">Odaberite županiju</option>{counties.map(county => <option key={county}>{county}</option>)}</Select>
    <label className="field"><span>Telefon (+385)</span><input type="tel" name="phone" defaultValue={profile?.phone ?? "+385 "} required maxLength={24} autoComplete="tel"/></label>
    {type === "dealer" && <>
      <label className="field"><span>OIB</span><input name="oib" inputMode="numeric" pattern="[0-9]{11}" maxLength={11} required defaultValue={profile?.oib}/></label>
      <label className="field"><span>Adresa sjedišta / salona</span><input name="address" defaultValue={profile?.address} maxLength={200} required autoComplete="street-address"/></label>
      <label className="field"><span>Radno vrijeme</span><input name="hours" defaultValue={profile?.hours} maxLength={120} required placeholder="Pon–pet 08:00–18:00"/></label>
      <p className="fine-print span-all">Pregled poddomene <strong>{subdomain || "vasasalon"}.sasija.hr</strong></p>
      {!registration && <label className="field span-all"><span>HTTPS adresa XML izvora</span><input type="url" name="importUrl" maxLength={500} defaultValue={profile?.importUrl}/><small>Postavka izvora za dogovoreni uvoz.</small></label>}
    </>}
  </div>;
}

export function AuthPage({ registration, defaultType, onDone }: { registration: boolean; defaultType: Profile["type"]; onDone: () => Promise<void> }) {
  const [type, setType] = useState<Profile["type"]>(defaultType);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formData(event);
    setBusy(true);setError("");
    try {
      await api(registration ? "auth/register" : "auth/login", { ...data, type, terms: !!data.terms, declaration: !!data.declaration, alerts: !!data.alerts });
      await onDone();
    } catch (problem) { setError(errorText(problem)); }
    finally { setBusy(false); }
  }
  return <main className="shell account-shell"><section className="detail-panel auth-card">
    <h1>{registration ? "Registracija" : "Prijava"}</h1>
    <form className="form-stack" onSubmit={submit}>
      {registration && <>
        <Select label="Vrsta računa" value={type} onChange={event => setType(event.target.value as Profile["type"])}><option value="private">Privatni prodavač / kupac</option><option value="dealer">Autokuća / trgovac vozilima (B2B)</option></Select>
        {type === "private" && <p className="fine-print">2 besplatna aktivna oglasa godišnje. Prije objave potvrdite broj +385.</p>}
        <ProfileFields key={type} type={type} registration/>
      </>}
      <label className="field"><span>E-pošta</span><input type="email" name="email" autoComplete="username" required maxLength={254}/></label>
      <label className="field"><span>Lozinka</span><input type="password" name="password" required minLength={registration ? 12 : undefined} maxLength={128} autoComplete={registration ? "new-password" : "current-password"}/></label>
      {registration && <fieldset className="account-checks"><legend>Uvjeti registracije</legend>
        <label><input type="checkbox" name="terms" required/><span>Prihvaćam <a href="/uvjeti-koristenja" target="_blank" rel="noreferrer">Opće uvjete poslovanja</a> i potvrđujem da sam pročitao/la <a href="/privatnost" target="_blank" rel="noreferrer">Politiku privatnosti (GDPR)</a>.</span></label>
        <label><input type="checkbox" name="declaration" required/><span>Izjavljujem da nastupam kao {type === "dealer" ? "registrirani trgovac" : "privatna osoba"} i da su podaci o vozilima točni.</span></label>
        <label><input type="checkbox" name="alerts"/><span>Želim primati obavijesti o spremljenim pretragama i padu cijena.</span></label>
      </fieldset>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy}>{registration ? "Otvori račun" : "Prijavi se"}</button>
    </form>
    <p>{registration ? "Već imate račun?" : "Nemate račun?"} <a className="legal-link" href={registration ? "/prijava" : "/registracija"}>{registration ? "Prijava" : "Registrirajte se"}</a></p>
  </section></main>;
}

export function Verification({ account, onVerified }: { account: Account; onVerified: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState("");
  const [error, setError] = useState("");
  const [busy,setBusy] = useState(false);
  async function doRequest(action: "start" | "verify") {
    setError(""); setBusy(true);
    try {
      if (action === "start") {
        const response = await api<{demoCode: string}>("otp/start", {});
        setDemo(response.demoCode);
      } else {
        await api("otp/verify",{code});setDemo("");setCode("");await onVerified();
      }
    } catch (problem) { setError(errorText(problem)); }
    finally { setBusy(false); }
  }
  if (account.verified) return <p className="verified-label">✓ {account.profile.phone} · Potvrđen u simulaciji</p>;
  return <div className="verification form-stack">
    <p>Potvrdite telefon {account.profile.phone}. SMS je simuliran.</p>
    <button className="btn secondary" type="button" disabled={busy} onClick={() => void doRequest("start")}>{demo ? "Zatraži novi kod" : "Zatraži SMS kod"}</button>
    {demo && <form className="form-stack" onSubmit={event => {event.preventDefault();void doRequest("verify");}}>
      <p className="calculation">Ogledni SMS kod <strong className="tabular">{demo}</strong></p>
      <label className="field"><span>Šesteroznamenkasti kod</span><input value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code"/></label>
      <button className="btn primary" disabled={busy}>Potvrdi broj</button>
    </form>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}

type Confirm = { kind:"delete-account" } | { kind:"delete-listing" | "boost"; listing:OwnedListing };
export function AccountPage({ account, inventory, refresh, onPublish, signOut, openPrivacySettings, initialTab = 0 }: {
  account: Account; inventory: Vehicle[]; refresh: () => Promise<void>; onPublish: (listing?: OwnedListing) => void; signOut: () => void;
  openPrivacySettings: () => void; initialTab?: number;
}) {
  const [tab,setTab] = useState(initialTab);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [confirm,setConfirm] = useState<Confirm>();
  const [reports,setReports] = useState<Report[]>([]);
  const [decision,setDecision] = useState("");
  const statusLabels = { draft:"Nacrt", active:"Aktivan", sold:"Prodan" };
  async function mutate(endpoint: string, data: object, success: string) {
    setBusy(true);setMessage("");setError("");
    try {
      await api(endpoint,data); await refresh();
      if (endpoint === "moderation") setReports(await api<Report[]>("moderation"));
      setMessage(success);setConfirm(undefined);
    } catch (problem) { setError(errorText(problem)); }
    finally { setBusy(false); }
  }
  function changeStatus(listing: OwnedListing, status: ListingStatus) {
    return mutate("listing/save",{ vehicle:listing, status },"Status oglasa je ažuriran.");
  }
  function exportData() {
    const { moderator, ...portable } = account;
    const url = URL.createObjectURL(new Blob([JSON.stringify(portable,null,2)],{type:"application/json"}));
    const link = document.createElement("a");link.href=url;link.download="sasija-moji-podaci.json";link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return <main className="shell account-shell">
    <header className="account-heading"><div><h1>Moj račun</h1><p>{account.profile.name} · {account.email}</p></div><button className="btn secondary" type="button" onClick={signOut}>Odjava</button></header>
    <nav className="utility-tabs account-tabs" aria-label="Odjeljci računa">
      {accountTabs.map((name,index) => <button key={name} type="button" aria-pressed={tab === index} onClick={() => {setTab(index);setError("");setMessage("");}}>{name}</button>)}
      {account.moderator && <button aria-pressed={tab === 4} type="button" onClick={async () => {setTab(4);try {setReports(await api<Report[]>("moderation"));} catch (problem) {setError(errorText(problem));}}}>DSA moderiranje</button>}
    </nav>
    {message && <p className="calculation" role="status">{message}</p>}
    {error && !confirm && <p className="form-error" role="alert">{error}</p>}
    {tab === 0 && <section className="detail-panel form-stack">
      <div className="account-heading"><h2>Moji oglasi</h2><button className="btn primary" type="button" onClick={() => onPublish()}>Predaj oglas</button></div>
      {account.profile.type === "private" && <p className="fine-print">2 besplatna aktivna oglasa godišnje.</p>}
      {!account.verified && account.profile.type === "private" && <Verification account={account} onVerified={refresh}/>}
      {account.listings.length === 0 && <p>Još nemate oglasa.</p>}
      {account.listings.map(listing => <article className="account-listing" key={listing.id}>
        <VehiclePhoto photo={listing.photos[0]} alt=""/>
        <div><h3>{listing.status === "active" ? <a href={"/?oglas="+encodeURIComponent(listing.id)}>{listing.title}</a> : listing.title}</h3>
          <p className="tabular">{statusLabels[listing.status]} · {euro(listing.price)} · {listing.views} pregleda · {listing.reveals} prikaza broja</p>
          {listing.status === "active" && (listing.boostedUntil ?? 0) > Date.now()/1000 && <p>Istaknut do {new Date(listing.boostedUntil! * 1000).toLocaleDateString("hr-HR")}.</p>}
          <div className="account-actions">
            <button type="button" className="btn secondary" onClick={() => onPublish(listing)}>Uredi</button>
            {listing.status !== "sold" && <button type="button" className="btn secondary" disabled={busy} onClick={() => void changeStatus(listing,listing.status === "draft" ? "active" : "sold")}>{listing.status === "draft" ? "Objavi" : "Označi kao prodano"}</button>}
            {listing.status === "active" && <button type="button" className="btn secondary" onClick={() => {setError("");setConfirm({kind:"boost",listing});}}>Istakni oglas (6 € / 7 dana)</button>}
            <button type="button" className="btn quiet" onClick={() => {setError("");setConfirm({kind:"delete-listing",listing});}}>Obriši</button>
          </div>
        </div>
      </article>)}
    </section>}
    {tab === 1 && <section className="detail-panel form-stack"><h2>Spremljena vozila</h2>
      {!account.favorites.length && <p>Još nemate spremljenih vozila.</p>}
      {account.favorites.map(favorite => {
        const vehicle = inventory.find(item => item.id === favorite.id);
        return <article className="saved-account-row" key={favorite.id}>
          <div>{vehicle ? <><a href={"/?oglas="+encodeURIComponent(vehicle.id)}>{vehicle.title}</a><p className="tabular">{euro(vehicle.price)}{vehicle.price < favorite.price && <strong className="price-drop"> · Pad cijene {euro(favorite.price - vehicle.price)}</strong>}</p></> : <p>Oglas više nije dostupan.</p>}</div>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void mutate("favorite",{...favorite,saved:false},"Oglas je uklonjen iz spremljenih.")}>Ukloni</button>
        </article>;
      })}
    </section>}
    {tab === 2 && <div className="form-stack">
      <section className="detail-panel form-stack"><h2>Profil</h2>
        <form className="form-stack" onSubmit={event => {event.preventDefault();void mutate("profile",formData(event),"Profil je spremljen.");}}>
          <ProfileFields type={account.profile.type} profile={account.profile}/><button className="btn primary" disabled={busy}>Spremi profil</button>
        </form>
        <Verification account={account} onVerified={refresh}/>
      </section>
      <section className="detail-panel"><h2>Promijeni lozinku</h2>
        <form className="form-stack" onSubmit={event => {event.preventDefault();const form=event.currentTarget;void mutate("password",formData(event),"Lozinka je promijenjena.").then(() => form.reset());}}>
          <label className="field"><span>Trenutačna lozinka</span><input name="current" type="password" autoComplete="current-password" required maxLength={128}/></label>
          <label className="field"><span>Nova lozinka</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label>
          <button className="btn primary" disabled={busy}>Promijeni lozinku</button>
        </form>
      </section>
    </div>}
    {tab === 3 && <section className="detail-panel form-stack"><h2>Privatnost i GDPR prava</h2>
      <form className="form-stack" onSubmit={event => {event.preventDefault();const data=formData(event);void mutate("profile",{alerts:!!data.alerts,analytics:!!data.analytics},"Postavke privatnosti su spremljene.");}}>
        <div className="account-checks"><label><input type="checkbox" name="alerts" defaultChecked={account.profile.alerts}/>E-mail obavijesti o pretragama i cijenama</label>
        <label><input type="checkbox" name="analytics" defaultChecked={account.profile.analytics}/>Privola za analitiku računa</label></div>
        <button className="btn secondary" disabled={busy}>Spremi privole</button>
      </form>
      <div className="account-actions"><button className="btn secondary" type="button" onClick={exportData}>Preuzmi moje podatke (JSON)</button>
      <button className="btn secondary" type="button" onClick={openPrivacySettings}>Postavke kolačića</button>
      <button className="btn secondary danger" type="button" onClick={() => {setError("");setConfirm({kind:"delete-account"});}}>Trajno obriši račun i sve oglase</button></div>
    </section>}
    {tab === 4 && account.moderator && <section className="detail-panel form-stack"><h2>DSA prijave</h2>
      {reports.map(report => <article key={report.id} className="calculation"><div><strong>{report.reason}</strong><p>{report.details}</p><p>{report.email || "Anonimna prijava"} · {report.status}</p><a className="legal-link" href={report.url}>Otvori prijavljeni oglas</a></div>
        {report.status === "pending" && <div className="form-stack">
          <label className="field"><span>Obrazloženje odluke</span><textarea onChange={event => setDecision(event.target.value)}/></label>
          <div className="account-actions"><button className="btn secondary" type="button" disabled={busy} onClick={() => void mutate("moderation",{id:report.id,decision,status:"dismissed"},"Odluka je spremljena.")}>Odbaci prijavu</button><button className="btn secondary" type="button" disabled={busy} onClick={() => void mutate("moderation",{id:report.id,decision,status:"removed"},"Oglas je povučen.")}>Povuci oglas</button></div>
        </div>}
      </article>)}
    </section>}
    {confirm && <Dialog title={confirm.kind === "delete-account" ? "Trajno brisanje računa" : confirm.kind === "boost" ? "Istakni oglas" : "Obriši oglas"} variant="form-dialog" onClose={() => setConfirm(undefined)}>
      <form className="dialog-content form-stack" onSubmit={event => {
        event.preventDefault();
        if (confirm.kind === "delete-account") void mutate("account/delete",formData(event),"Račun je obrisan.");
        else void mutate(confirm.kind === "boost" ? "listing/boost" : "listing/delete",{id:confirm.listing.id},confirm.kind === "boost" ? "Ogledno isticanje aktivno je 7 dana." : "Oglas je obrisan.");
      }}>
        <p>{confirm.kind === "delete-account" ? "Račun, svi vaši oglasi i spremljena vozila bit će trajno obrisani." :
          confirm.kind === "boost" ? "Isticanje traje 7 dana. Ovo je ogledna aktivacija usluge od 6 €. Naplate nema." : "Oglas će biti trajno uklonjen iz vašeg računa."}</p>
        {confirm.kind === "delete-account" && <label className="field"><span>Potvrdite lozinku</span><input required name="password" type="password" autoComplete="current-password"/></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="account-actions"><button className="btn secondary" type="button" onClick={() => setConfirm(undefined)}>Odustani</button><button className="btn primary" disabled={busy}>{confirm.kind === "boost" ? "Aktiviraj ogledno isticanje" : "Trajno obriši"}</button></div>
      </form>
    </Dialog>}
  </main>;
}

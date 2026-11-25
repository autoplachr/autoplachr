"use client";
import { Checkbox } from "../src/components/Checkbox";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "./account-api";
import { Dialog, Select } from "./ui";
import { vehicleListingPath } from "../src/lib/seo";

export const legalLinks = {
  "/uvjeti-koristenja":"Opći uvjeti poslovanja",
  "/privatnost":"Politika privatnosti",
  "/kolacici":"Politika kolačića",
  "/dsa-prijava":"Akt o digitalnim uslugama",
} as const;
export type LegalPath = keyof typeof legalLinks;
type Operator = { operator: string; address: string; email: string };
const sources = { gdpr:"https://eur-lex.europa.eu/eli/reg/2016/679/oj", dsa:"https://eur-lex.europa.eu/eli/reg/2022/2065/oj", zek:"https://narodne-novine.nn.hr/clanci/sluzbeni/full/2022_07_76_1116.html" };

export function LegalPage({ path, cookieSettings, report }: { path:LegalPath; cookieSettings:() => void; report:() => void }) {
  const [operator,setOperator] = useState<Operator>();
  const [receipt,setReceipt] = useState("");
  const [result,setResult] = useState("");
  useEffect(() => {void api<Operator>("config").then(setOperator).catch(() => undefined);},[]);
  const contact = operator?.operator && operator.email && operator.address ? <p>{operator.operator} · {operator.address} · <a href={"mailto:"+operator.email}>{operator.email}</a></p> : <p>Identitet, adresa i službena e-pošta operatora još nisu objavljeni. Dokument vrijedi kao nacrt za privatni pregled platforme.</p>;
  return <main className="shell account-shell legal-shell">
    <article className="detail-panel legal-document"><header className="account-heading"><div><h1>{legalLinks[path]}</h1><p>Verzija od 25. studenoga 2026.</p></div><button className="btn secondary legal-print" type="button" onClick={() => window.print()}>Ispiši</button></header>
    {path === "/uvjeti-koristenja" && <>
      <section><h2>Operator i usluga</h2>{contact}<p>AUTOPLAC.HR objavljuje oglase i omogućava kontakt kupaca i prodavača. Prodavač određuje cijenu i uvjete prodaje. Kupoprodaja, uplata, pregled vozila i prijenos vlasništva ugovaraju se izravno s prodavačem. Za oznaku trgovca u oglasu odgovara osoba koja oglas objavi.</p></section>
      <section><h2>Račun i objava</h2><p>Privatna osoba može prvi put aktivirati najviše dva besplatna oglasa u kalendarskoj godini. Prodaja ili brisanje prethodnog oglasa ne vraća iskorišteno mjesto. Za aktivaciju privatnog oglasa računa se potvrda hrvatskog broja +385 u ovom okruženju. Trgovci moraju navesti naziv, OIB, adresu i kontakt te održavati podatke točnima. Proba pokazuje samo predloženi naziv poddomene.</p><p>Organizirana preprodaja kao privatna osoba nije dopuštena. Trgovci moraju navesti svoj profesionalni status te poštovati primjenjiva potrošačka i porezna pravila.</p></section>
      <section><h2>Pravila oglasa i rangiranje</h2><p>Smijete oglašavati vozilo za koje imate pravo raspolaganja. Navedite točan VIN, kilometražu, cijenu i poznata bitna oštećenja. Zabranjeni su lažni VIN-ovi, namjerno izmijenjena kilometraža, obmanjujuća cijena, duplicirani oglasi i slike bez prava upotrebe. Ažurirajte oglase nakon prodaje.</p><p>Zadani redoslijed polazi od novijih oglasa. Isticanje utječe na poziciju korisničkog oglasa u zadanom poretku sedam dana. Cijena predviđene usluge je 6 €. U privatnom pregledu aktivacija je ogledna i bez naplate. Kupac može odabrati druge kriterije sortiranja.</p></section>
      <section><h2>Moderiranje i prigovor</h2><p>Oglas možemo privremeno povući zbog sumnje na prijevaru, nezakonit sadržaj ili kršenje ovih pravila. Prijave se razmatraju pojedinačno. Korisnik može zatražiti obrazloženje i preispitivanje odluke uz oznaku oglasa ili prijave. Na odluke nadležnih tijela odgovaramo prema primjenjivom pravu.</p><a href="/dsa-prijava">Prijava sadržaja i DSA prava</a></section>
    </>}
    {path === "/privatnost" && <>
      <section><h2>Voditelj obrade</h2>{contact}</section>
      <section><h2>Podaci, svrhe i pravne osnove</h2><p>Za registraciju i izvršavanje ugovora o korištenju obrađujemo podatke profila, e-poštu, telefon, grad, županiju, status prodavača, oglase i spremljena vozila. Lozinka se čuva kao posoljeni kriptografski sažetak. OIB i poslovna adresa obrađuju se radi identifikacije trgovca, izvršavanja usluge i ispunjavanja primjenjivih zakonskih obveza.</p><p>Minimalni zapisi za sprečavanje zlouporabe i brojači koriste se radi sigurnosti i rada oglasa na temelju legitimnog interesa. DSA prijave obrađuju se radi ispunjenja primjenjivih zakonskih obveza i postupanja po prijavi. Neobavezne privole za obavijesti i analitiku postavljate odvojeno. U ovoj verziji postavke se pohranjuju, a alati za analitiku i slanje marketinških obavijesti nisu uključeni.</p></section>
      <section><h2>Javni podaci, fotografije i primatelji</h2><p>Oglas prikazuje podatke vozila, ime prodavača i mjesto te omogućuje kontakt. OIB i poslovne postavke izvora uvoza ostaju u računu. Fotografije učitane kroz obrazac ponovno se kodiraju iz piksela, čime se uklanjaju izvorni EXIF podaci, uključujući GPS. Vidljivi sadržaj fotografije poput registracije ili kućne adrese ostaje na slici.</p><p>Hosting i pohrana služe za izvršavanje usluge. Otvaranje izvorne fotografije ili vanjske usluge provjere vozila može dovesti do obrade kod tog pružatelja. Prije javnog pokretanja operator mora objaviti konkretne primatelje i primjenjiva jamstva za međunarodne prijenose.</p></section>
      <section><h2>Čuvanje i brisanje</h2><p>Podaci računa, spremljena vozila i oglasi čuvaju se dok ih korisnik ne izbriše. Valjanost prijavne sesije traje do 14 dana, a koda do pet minuta. Prijave mogu ostati u moderacijskom zapisu dok se obrađuju i radi dokazivanja postupanja. U ovoj verziji zapisi prijava nemaju automatsko periodično brisanje. Nakon brisanja računa uklanjamo identitet iz prijava koje imaju istu adresu e-pošte.</p></section>
      <section><h2>Vaša prava</h2><p>Možete zatražiti pristup i ispravak podataka, brisanje, ograničenje i prenosivost te podnijeti prigovor. Privolu možete povući u bilo kojem trenutku u postavkama. U računu možete preuzeti JSON i trajno obrisati račun. Za ostale zahtjeve obratite se voditelju obrade. Pritužbu možete podnijeti Agenciji za zaštitu osobnih podataka (AZOP).</p><p><a href={sources.gdpr}>Opća uredba o zaštiti podataka</a> · <a href="https://azop.hr/">AZOP</a></p></section>
    </>}
    {path === "/kolacici" && <>
      <section><h2>Nužna pohrana</h2><p>Nužni kolačić autoplac_session održava prijavu najdulje 14 dana. U pohrani preglednika ostaju izbor teme i privole, kao i vozila koja ste spremili dok ste bili odjavljeni. Stranica hostinga može koristiti svoju prijavnu pohranu za pristup privatnoj stranici.</p></section>
      <section><h2>Analitički i marketinški alati</h2><p>Izbori su zadano isključeni. Platforma trenutačno ne učitava analitičke ili marketinške skripte. Spremanje izbora omogućava izmjenu postavki na ovom pregledniku. Odbijanje opcionalne pohrane ne ograničava korištenje oglasnika.</p></section>
      <section><h2>Odabir i povlačenje privole</h2><p>Postavke možete izmijeniti putem podnožja. Možete i obrisati pohranu stranice u pregledniku, što briše postavke na uređaju i može vas odjaviti.</p><button className="btn secondary" type="button" onClick={cookieSettings}>Postavke kolačića</button><p><a href={sources.zek}>Zakon o elektroničkim komunikacijama</a> · <a href="https://azop.hr/obrada-osobnih-podataka-kolacici/">Smjernice AZOP-a</a></p></section>
    </>}
    {path === "/dsa-prijava" && <>
      <section><h2>Kako prijaviti sadržaj</h2><p>Na stranici oglasa odaberite „Prijavi oglas”. Možete se poslužiti i obrascem na ovoj stranici. Navedite izravnu poveznicu, razlog te činjenice koje omogućuju prepoznavanje nezakonitosti. Ako sadržaj samo krši pravila platforme, navedite što treba ispraviti. Obrazac traži ime, e-poštu i potvrdu dobre vjere. Zakonska iznimka za određene prijave seksualnog zlostavljanja djece dopušta izostavljanje podataka prijavitelja.</p><button type="button" className="btn primary" onClick={report}>Otvori obrazac za prijavu</button></section>
      <section><h2>Potvrda i odluka</h2><p>Nakon predaje dobivate broj predmeta. Sačuvajte ga za provjeru statusa. Moderator pregledava obrazloženje i može povući oglas ili odbaciti prijavu. Za obavijest ili prigovor navedite broj predmeta pri obraćanju operatoru. U ovoj verziji status i obrazloženje mogu se provjeriti ovdje.</p>
        <form className="form-stack" onSubmit={async event => {event.preventDefault();try {const data=await api<{status:string;decision?:string}>("report/status?id="+encodeURIComponent(receipt));setResult(({pending:"Zaprimljena",removed:"Oglas povučen",dismissed:"Prijava odbačena"} as Record<string,string>)[data.status]+(data.decision ? " · "+data.decision : ""));} catch(error){setResult(error instanceof Error ? error.message : "Status nije dostupan.");}}}>
          <label className="field"><span>Broj predmeta</span><input value={receipt} onChange={event => setReceipt(event.target.value)} required maxLength={36}/></label>
          <button type="submit" className="btn secondary">Provjeri status</button>{result && <p role="status">{result}</p>}
        </form></section>
      <section><h2>Kontakt i pravna zaštita</h2>{contact}<p>Kada je primjenjivo, od operatora možete zatražiti preispitivanje odluke, obratiti se certificiranom tijelu za izvansudsko rješavanje sporova ili zatražiti sudsku zaštitu. Za pritužbe u vezi s primjenom DSA-a možete se obratiti nadležnom koordinatoru za digitalne usluge.</p><p><a href={sources.dsa}>Akt o digitalnim uslugama</a> · <a href="https://www.hakom.hr/">HAKOM</a></p></section>
    </>}
    </article>
  </main>;
}

export function ReportDialog({ listing, onClose }: { listing?:string; onClose:() => void }) {
  const [anonymous,setAnonymous] = useState(false);
  const [result,setResult] = useState("");
  const [problem,setProblem] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setProblem("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const url = new URL(String(data.url),window.location.origin);
      const response = await api<{id:string}>("report",{...data,url:url.href,listing:listing ?? url.searchParams.get("oglas"),goodFaith:!!data.goodFaith,exception:anonymous});
      setResult(response.id);
    } catch (error) {setProblem(error instanceof Error ? error.message : "Prijava nije poslana.");}
    finally {setBusy(false);}
  }
  return <Dialog title="Prijavi oglas" variant="form-dialog" onClose={onClose}>
    {result ? <div className="dialog-content form-stack"><p role="status">Prijava je zaprimljena. Sačuvajte broj predmeta <strong className="tabular">{result}</strong>.</p><a className="legal-link" href="/dsa-prijava">Provjera statusa prijave</a></div> :
      <form className="dialog-content form-stack" onSubmit={submit}>
        <label className="field"><span>Poveznica oglasa</span><input type="url" name="url" required readOnly={!!listing} defaultValue={listing ? window.location.origin + vehicleListingPath(listing) : ""}/></label>
        <Select label="Razlog prijave" name="reason" required defaultValue=""><option value="">Odaberite razlog</option>{["Sumnja na skidanje kilometara","Lažni oglas / prevara","Vozilo je već prodano","Krivi podaci / cijena","Drugi nezakonit sadržaj"].map(reason => <option key={reason}>{reason}</option>)}</Select>
        <label className="field"><span>Obrazloženje i dokazne poveznice</span><textarea rows={4} name="details" required minLength={15} maxLength={2500}/></label>
        {!anonymous && <div className="form-grid"><label className="field"><span>Ime i prezime</span><input name="name" required maxLength={120}/></label><label className="field"><span>E-pošta</span><input type="email" name="email" required maxLength={254}/></label></div>}
        <div className="account-checks">
          <label><Checkbox checked={anonymous} onChange={event => setAnonymous(event.target.checked)}/>Primjenjuje se zakonska iznimka za prijavu seksualnog zlostavljanja djece.</label>
          <label><Checkbox name="goodFaith" required/>U dobroj vjeri potvrđujem da su navodi točni i potpuni.</label>
        </div>
        {problem && <p role="alert" className="form-error">{problem}</p>}
        <button className="btn primary" disabled={busy}>Pošalji prijavu</button>
      </form>}
  </Dialog>;
}

type CookieChoice = { analytics:boolean; marketing:boolean };
const consentKey = "autoplac.cookies.v1";
export function CookieConsent({ settings, close }: { settings:boolean; close:()=>void }) {
  const [choice,setChoice] = useState<CookieChoice | null | undefined>();
  const [analytics,setAnalytics] = useState(false);
  const [marketing,setMarketing] = useState(false);
  const [configure,setConfigure] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(consentKey) || "null");
      setChoice(saved);setAnalytics(saved?.analytics === true);setMarketing(saved?.marketing === true);
    } catch {setChoice(null);}
  },[]);
  const open = settings || configure;
  function save(next:CookieChoice) {
    try {
      localStorage.setItem(consentKey,JSON.stringify(next));
      localStorage.setItem("autoplac_cookie_consent",JSON.stringify(next));
      window.dispatchEvent(new Event("autoplac:cookies-updated"));
    } catch {}
    setChoice(next);setAnalytics(next.analytics);setMarketing(next.marketing);setConfigure(false);close();
  }
  if (choice !== null && !open) return null;
  return <aside className="cookie-banner" aria-label="Privatnost i kolačići">
    <div><h2>{open ? "Postavke kolačića" : "Kolačići i privatnost"}</h2><p>Nužna pohrana omogućuje prijavu i pamti postavke. Opcionalne skupine možete odabrati zasebno. <a href="/kolacici">Politika kolačića</a></p>
      {open && <div className="account-checks"><label><Checkbox checked disabled/>Nužni</label>
        <label><Checkbox checked={analytics} onChange={event => setAnalytics(event.target.checked)}/>Analitički</label>
        <label><Checkbox checked={marketing} onChange={event => setMarketing(event.target.checked)}/>Marketinški</label></div>}
    </div>
    <div className="account-actions">
      <button className="btn secondary" type="button" onClick={() => save({analytics:true,marketing:true})}>Prihvati sve</button>
      <button className="btn secondary" type="button" onClick={() => save({analytics:false,marketing:false})}>Samo nužni</button>
      <button className="btn secondary" type="button" onClick={() => open ? save({analytics,marketing}) : setConfigure(true)}>{open ? "Spremi postavke" : "Postavke"}</button>
    </div>
  </aside>;
}

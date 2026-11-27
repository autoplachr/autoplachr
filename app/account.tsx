"use client";

import { Checkbox } from "../src/components/Checkbox";
import {
  ArrowLeft,
  Bell,
  Building2,
  Calculator,
  CarFront,
  Check,
  Eye,
  EyeOff,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Scale,
  Send,
  Settings,
  ShieldCheck,
  TrendingDown,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  api,
  leadTrackingAvailable,
  type SellerAnalytics,
  type Account,
  type Conversation,
  type ListingStatus,
  type OwnedListing,
  type Profile,
  type Report,
} from "./account-api";
import sampleFeed from "../data/dealership-feed-sample.json";
import type { FeedVehicle } from "../src/lib/dealership-feed";
import { importClassifieds, importedDealerVehicle } from "./classifieds-import";
import { demoCredentials, localDemo } from "./local-demo";
import { profileErrors, type FieldErrors } from "../src/data/profile-validation";
import { euro, marketValuation, number, registered, type Vehicle } from "./catalog";
import { sellerAdvisoryText } from "../src/lib/price-engine";
import { boostPlans, B2B_FOUNDER_OFFER, B2B_PACKAGES, hasActiveBoost, type PaidBoostTier } from "./listing-boost";
import { LocationFields, HoursFields } from "./dealership-fields";
import { AnalyticsOverview, emptyAnalytics, LeadInbox, TrialReport } from "./seller-analytics";
import { WindshieldSheet } from "./windshield-sheet";
import { ValuationAuditPanel } from "./valuation-audit";
import { Dialog, Rating, VehiclePhoto } from "./ui";
import { ComparisonModal } from "./comparison-modal";
import { isSupabaseConfigured } from "../src/lib/supabase/client";
import { subscribeSupabaseMessages } from "../src/lib/supabase/account-bridge";
import { vehicleListingPath } from "../src/lib/seo";

export type AccountTabKey = "pregled" | "oglasi" | "poruke" | "favoriti" | "b2b" | "postavke" | "moderiranje";

const QUICK_REPLIES = [
  "Pozdrav, je li vozilo još dostupno?",
  "Može li pregled u ovlaštenom servisu?",
  "Šaljem broj šasije (VIN) u nastavku.",
] as const;

const formData = (event: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget));
function errorText(error: unknown) {
  const message = error instanceof Error ? error.message
    : typeof error === "string" ? error
    : typeof (error as { message?: unknown } | null)?.message === "string" ? (error as { message: string }).message
    : "Greška pri prijavi.";
  return typeof message === "string" && message ? message : "Greška pri prijavi.";
}

function FieldIssue({ message }: { message?: string }) {
  return message ? (
    <small className="field-issue" role="alert">
      {message}
    </small>
  ) : null;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function ProfileFields({
  type,
  profile,
  registration = false,
  errors = {},
}: {
  type: Profile["type"];
  profile?: Partial<Profile>;
  registration?: boolean;
  errors?: FieldErrors;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const subdomain = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  return (
    <div className="form-grid">
      <label className="field span-all">
        <span>{type === "dealer" ? "Naziv tvrtke / autokuće" : "Ime i prezime"}</span>
        <input
          name="name"
          value={name}
          onChange={event => setName(event.target.value)}
          required
          maxLength={100}
          placeholder={type === "dealer" ? "npr. Auto Centar Horvat d.o.o." : "npr. Ivan Horvat"}
          autoComplete={type === "dealer" ? "organization" : "name"}
        />
        <FieldIssue message={errors.name} />
      </label>
      <LocationFields initial={profile} errors={errors} />
      <label className="field">
        <span>Telefon (+385)</span>
        <input
          type="tel"
          name="phone"
          defaultValue={profile?.phone ?? "+385 "}
          required
          maxLength={24}
          autoComplete="tel"
          aria-invalid={!!errors.phone}
        />
        <FieldIssue message={errors.phone} />
      </label>
      {type === "dealer" && (
        <>
          <label className="field">
            <span>OIB (11 znamenki)</span>
            <input
              name="oib"
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              required
              defaultValue={profile?.oib}
              aria-invalid={!!errors.oib}
            />
            <FieldIssue message={errors.oib} />
          </label>
          <label className="field span-all">
            <span>Adresa salona</span>
            <input
              name="address"
              defaultValue={profile?.address}
              maxLength={200}
              required
              autoComplete="street-address"
              aria-invalid={!!errors.address}
            />
            <FieldIssue message={errors.address} />
          </label>
          {!registration && <HoursFields initial={profile?.workingHours} legacy={profile?.hours} />}
          <p className="fine-print span-all">
            Javna adresa salona: <strong>{subdomain || "vasasalon"}.autoplac.hr</strong>
          </p>
        </>
      )}
    </div>
  );
}

export function AuthPage({
  registration,
  defaultType,
  onDone,
}: {
  registration: boolean;
  defaultType: Profile["type"];
  onDone: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">(registration ? "register" : "login");
  const [type, setType] = useState<Profile["type"]>(defaultType);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [demo, setDemo] = useState(false);
  const [sample, setSample] = useState<ReturnType<typeof demoCredentials>>();

  useEffect(() => {
    setMode(registration ? "register" : "login");
    setError("");
    setErrors({});
    setResetMode(false);
  }, [registration]);

  useEffect(() => setDemo(localDemo()), []);

  async function quickLogin(nextType: Profile["type"]) {
    setBusy(true);
    setError("");
    setErrors({});
    try {
      await api("auth/demo", { type: nextType });
      await onDone();
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ ok?: boolean; redirecting?: boolean }>("auth/google", {});
      if (!res?.redirecting) {
        await onDone();
      }
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("resetEmail") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Unesite valjanu e-mail adresu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("auth/reset", { email });
      setResetSent(email);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formData(event);
    const isReg = mode === "register";
    const fields = isReg ? profileErrors(data, type === "dealer") : {};
    if (isReg && !data.postalCode && data.city) delete fields.postalCode;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) fields.email = "Unesite valjanu e-mail adresu.";
    if (String(data.password).length < (isReg ? 8 : 1)) {
      fields.password = isReg ? "Lozinka mora imati najmanje 8 znakova." : "Unesite lozinku.";
    }
    if (isReg && !data.terms) fields.terms = "Potvrdite uvjete i politiku privatnosti.";
    if (isReg && !data.declaration) fields.declaration = "Potvrdite izjavu o statusu prodavača.";
    setErrors(fields);
    setError("");
    if (Object.keys(fields).length) return;
    setBusy(true);
    try {
      await api(
        isReg ? "auth/register" : "auth/login",
        {
          ...data,
          type,
          terms: !!data.terms,
          declaration: !!data.declaration,
          alerts: !!data.alerts,
        },
      );
      await onDone();
    } catch (problem) {
      const fieldIssues = (problem as { fields?: FieldErrors } | null)?.fields;
      if (fieldIssues && Object.keys(fieldIssues).length) setErrors(fieldIssues);
      else setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="shell account-shell">
      <section className="detail-panel auth-card flex flex-col gap-4 rounded-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="eyebrow">AUTOPLAC.HR račun</span>
            <h1 className="!m-0 mt-0.5 text-[24px] font-bold tracking-tight text-[var(--text)]">
              {mode === "register" ? "Otvorite korisnički račun" : "Prijava na račun"}
            </h1>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--hover)] p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                mode === "login"
                  ? "bg-[#2563EB] text-white"
                  : "text-[var(--spec)] hover:text-[var(--text)]"
              }`}
              onClick={() => {
                setMode("login");
                setResetMode(false);
                setError("");
                setErrors({});
              }}
            >
              Prijava
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                mode === "register"
                  ? "bg-[#2563EB] text-white"
                  : "text-[var(--spec)] hover:text-[var(--text)]"
              }`}
              onClick={() => {
                setMode("register");
                setResetMode(false);
                setError("");
                setErrors({});
              }}
            >
              Registracija
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void googleSignIn()}
          className="w-full min-h-[42px] inline-flex items-center justify-center gap-2.5 rounded-lg border border-[var(--border-hover)] bg-[var(--surface)] hover:bg-[var(--hover)] px-4 text-[14px] font-semibold text-[var(--text)] transition-colors"
        >
          <GoogleIcon />
          <span>Nastavi putem Googlea</span>
        </button>

        <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span>ili putem e-pošte</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {demo && mode === "login" && !resetMode && (
          <div className="flex flex-wrap gap-2 pb-1">
            <button className="btn secondary text-[12.5px]" type="button" disabled={busy} onClick={() => void quickLogin("dealer")}>
              Brza prijava: Autokuća B2B
            </button>
            <button className="btn secondary text-[12.5px]" type="button" disabled={busy} onClick={() => void quickLogin("private")}>
              Brza prijava: Privatni korisnik
            </button>
          </div>
        )}

        {demo && mode === "register" && (
          <div>
            <button
              className="btn secondary text-[12.5px]"
              type="button"
              onClick={() => {
                setSample(demoCredentials(type, true));
                setErrors({});
                setError("");
              }}
            >
              Popuni testnim podacima
            </button>
          </div>
        )}

        {resetMode ? (
          <form className="form-stack" onSubmit={handleReset} noValidate>
            <p className="text-[13px] text-[var(--muted)] !m-0">
              Unesite e-mail adresu povezanu s vašim računom. Poslat ćemo vam poveznicu za postavljanje nove lozinke.
            </p>
            <label className="field">
              <span>E-mail adresa</span>
              <input type="email" name="resetEmail" required maxLength={254} placeholder="ime@primjer.hr" />
            </label>
            {resetSent && (
              <p className="calculation !m-0" role="status">
                Ako postoji račun za <strong>{resetSent}</strong>, poslali smo upute za poništavanje lozinke.
              </p>
            )}
            {error && (
              <p className="form-error !m-0" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button type="submit" className="btn primary" disabled={busy}>
                Pošalji poveznicu
              </button>
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  setResetMode(false);
                  setResetSent("");
                  setError("");
                }}
              >
                Natrag na prijavu
              </button>
            </div>
          </form>
        ) : (
          <form key={`${mode}-${sample?.email ?? "empty"}`} className="form-stack" onSubmit={submit} noValidate>
            {mode === "register" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Vrsta računa">
                  <button
                    type="button"
                    aria-pressed={type === "private"}
                    onClick={() => {
                      setType("private");
                      setSample(undefined);
                      setErrors({});
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      type === "private"
                        ? "border-[#2563EB] bg-blue-500/10"
                        : "border-[var(--border)] bg-[var(--hover)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-[13.5px] text-[var(--text)]">
                      <UserRound size={16} className="text-[#2563EB]" />
                      <span>Privatna osoba</span>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mt-1 !m-0">Besplatni oglasi, favoriti i chat s kupcima</p>
                  </button>
                  <button
                    type="button"
                    aria-pressed={type === "dealer"}
                    onClick={() => {
                      setType("dealer");
                      setSample(undefined);
                      setErrors({});
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      type === "dealer"
                        ? "border-[#2563EB] bg-blue-500/10"
                        : "border-[var(--border)] bg-[var(--hover)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-[13.5px] text-[var(--text)]">
                      <Building2 size={16} className="text-[#2563EB]" />
                      <span>Autokuća / Trgovac (B2B)</span>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mt-1 !m-0">R1 račun, javna poddomena i značka salona</p>
                  </button>
                </div>
                <ProfileFields key={type} type={type} profile={sample} errors={errors} registration />
              </>
            )}

            <label className="field">
              <span>E-mail adresa</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                maxLength={254}
                defaultValue={sample?.email}
                aria-invalid={!!errors.email}
                placeholder="ime@primjer.hr"
              />
              <FieldIssue message={errors.email} />
            </label>

            <div className="field">
              <div className="flex items-center justify-between">
                <span>{mode === "register" ? "Lozinka (min. 8 znakova)" : "Lozinka"}</span>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                    onClick={() => {
                      setResetMode(true);
                      setError("");
                    }}
                  >
                    Zaboravljena lozinka?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  maxLength={128}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  defaultValue={sample?.password}
                  aria-invalid={!!errors.password}
                  className="!pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <FieldIssue message={errors.password} />
            </div>

            {mode === "register" && (
              <fieldset className="account-checks">
                <legend>Uvjeti registracije</legend>
                <label>
                  <Checkbox name="terms" required defaultChecked={Boolean(sample)} />
                  <span>
                    Prihvaćam{" "}
                    <a href="/uvjeti-koristenja" target="_blank" rel="noreferrer">
                      Opće uvjete poslovanja
                    </a>{" "}
                    i{" "}
                    <a href="/privatnost" target="_blank" rel="noreferrer">
                      Politiku privatnosti (GDPR)
                    </a>
                    .<FieldIssue message={errors.terms} />
                  </span>
                </label>
                <label>
                  <Checkbox name="declaration" required defaultChecked={Boolean(sample)} />
                  <span>
                    Izjavljujem da nastupam kao {type === "dealer" ? "registrirani trgovac" : "privatna osoba"} i da su
                    podaci o vozilima točni.<FieldIssue message={errors.declaration} />
                  </span>
                </label>
                <label>
                  <Checkbox name="alerts" defaultChecked />
                  <span>Želim primati e-mail obavijesti o porukama i padu cijena spremljenih vozila.</span>
                </label>
              </fieldset>
            )}

            {error && (
              <p className="form-error !m-0" role="alert">
                {error}
              </p>
            )}

            <button className="btn primary min-h-[42px]" disabled={busy}>
              {mode === "register" ? "Otvori račun" : "Prijavi se"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

type Confirm = { kind: "delete-account" } | { kind: "delete-listing" | "boost"; listing: OwnedListing };

function PrivateListingValuation({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const result = open ? marketValuation(vehicle) : undefined;
  const advisory = result && sellerAdvisoryText(result.deltaPercent, result.fairMax);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="btn quiet min-h-11">Privatna procjena cijene</summary>
    {result && <>
      <p className="tabular">Tržišni raspon {euro(result.fairMin)} – {euro(result.fairMax)}</p>
      {advisory && <p className="seller-advisory">{advisory}</p>}
      <ValuationAuditPanel result={result} />
    </>}
  </details>;
}

export function AccountPage({
  account,
  inventory,
  refresh,
  onPublish,
  signOut,
  openPrivacySettings,
  onOpenListing,
  initialTab = "pregled",
  initialConversationId,
}: {
  account: Account;
  inventory: Vehicle[];
  refresh: () => Promise<void>;
  onPublish: (listing?: OwnedListing) => void;
  signOut: () => void;
  openPrivacySettings: () => void;
  onOpenListing?: (id: string) => void;
  initialTab?: AccountTabKey;
  initialConversationId?: string;
}) {
  const [tab, setTab] = useState<AccountTabKey>(initialTab);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [analyticsError, setAnalyticsError] = useState("");
  const [sheet, setSheet] = useState<OwnedListing>();
  const [inboxMode, setInboxMode] = useState<"leads" | "chat">(initialConversationId ? "chat" : "leads");
  const loadAnalytics = useCallback(async () => {
    if (!leadTrackingAvailable()) return;
    try {
      setAnalytics(await api<SellerAnalytics>("lead/analytics"));
      setAnalyticsError("");
    } catch (problem) {
      setAnalyticsError(errorText(problem));
    }
  }, []);
  useEffect(() => { void loadAnalytics(); }, [loadAnalytics, account.id]);
  function openAnalyticsListing(id: string) {
    if (onOpenListing) onOpenListing(id);
    else window.location.assign(vehicleListingPath(id));
  }
  const [listingFilter, setListingFilter] = useState<"all" | ListingStatus>("all");
  const [activeConvId, setActiveConvId] = useState<string>(initialConversationId || account.conversations?.[0]?.id || "");
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialConversationId));
  const [draftMsg, setDraftMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [draftPriceEur, setDraftPriceEur] = useState<string>("");
  const [xmlFeedDraft, setXmlFeedDraft] = useState<string>(account.profile.importUrl ?? "");
  const [classifiedLinks, setClassifiedLinks] = useState("");
  const [feedProgress, setFeedProgress] = useState("");
  const [feedFile, setFeedFile] = useState<File>();
  const [feedPreview, setFeedPreview] = useState<{ vehicles: FeedVehicle[]; skipped: number; issues: string[]; sample: boolean }>();
  const selectedTier = account.profile.subscriptionTier ?? "starter";

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [boostNotice, setBoostNotice] = useState("");
  useEffect(() => {
    if (!boostNotice) return;
    const timeout = window.setTimeout(() => setBoostNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [boostNotice]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Confirm>();
  const [profileIssues, setProfileIssues] = useState<FieldErrors>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [decision, setDecision] = useState("");

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConvId(initialConversationId);
      setInboxMode("chat");
      setMobileShowChat(true);
    }
  }, [initialConversationId]);

  // Realtime subscription + local event sync for live messaging
  useEffect(() => {
    const unsubSupa = subscribeSupabaseMessages(account.id, () => {
      void loadAnalytics();
      void refresh();
    });
    const onLocalSync = () => { void refresh(); void loadAnalytics(); };
    const onLocalStorage = (event: StorageEvent) => {
      if (event.key === "autoplac.local-demo.v1") onLocalSync();
    };
    window.addEventListener("autoplac:inbox-sync", onLocalSync);
    window.addEventListener("storage", onLocalStorage);
    return () => {
      unsubSupa();
      window.removeEventListener("autoplac:inbox-sync", onLocalSync);
      window.removeEventListener("storage", onLocalStorage);
    };
  }, [account.id, refresh, loadAnalytics]);

  const conversations: Conversation[] = account.conversations ?? [];
  const activeConversation = conversations.find(c => c.id === activeConvId) ?? conversations[0];

  // Mark active conversation read when viewed in Poruke tab
  useEffect(() => {
    if (tab !== "poruke" || inboxMode !== "chat" || !activeConversation || activeConversation.unreadCount === 0) return;
    void api("conversation/read", { conversationId: activeConversation.id }).then(() => refresh());
  }, [tab, inboxMode, activeConversation, refresh]);

  const statusLabels: Record<ListingStatus, { label: string; tone: string }> = {
    active: { label: "Aktivan", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    paused: { label: "Pauziran", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    sold: { label: "Prodan", tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
    draft: { label: "Nacrt", tone: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25" },
  };

  async function mutate(endpoint: string, data: object, success: string) {
    setBusy(true);
    setMessage("");
    setError("");
    setProfileIssues({});
    try {
      await api(endpoint, data);
      if (endpoint === "listing/boost") {
        setBoostNotice(success);
        setConfirm(undefined);
      }
      await refresh();
      if (endpoint === "moderation") setReports(await api<Report[]>("moderation"));
      if (endpoint !== "listing/boost") setMessage(success);
      setConfirm(undefined);
    } catch (problem) {
      const fields = (problem as { fields?: FieldErrors } | null)?.fields;
      if (endpoint === "profile" && fields && Object.keys(fields).length) setProfileIssues(fields);
      else setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }

  async function previewFeed(useSample: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    setFeedPreview(undefined);
    try {
      const { maxFeedBytes, parseDealershipFeed, readFeedResponse } = await import("../src/lib/dealership-feed");
      let content: string;
      let base: string | undefined;
      const dealer = account.profile;
      const seller = { id: account.id, name: dealer.name, city: dealer.city,
        county: dealer.county, phone: dealer.phone, address: dealer.address };
      const urls = [...new Set(classifiedLinks.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
      let parsed: { vehicles: FeedVehicle[]; skipped: number; issues: string[] };
      if (!useSample && urls.length) {
        if (urls.length > 20) throw new Error("Unesite najviše 20 poveznica po uvozu.");
        parsed = { vehicles: [], skipped: 0, issues: [] };
        for (const [index, url] of urls.entries()) {
          setFeedProgress("Preuzimanje oglasa " + (index + 1) + "/" + urls.length + "…");
          try {
            const result = await importClassifieds({ url });
            parsed.vehicles.push(await importedDealerVehicle(result, result.source ?? url, seller));
          } catch (problem) {
            parsed.skipped++;
            parsed.issues.push("Oglas " + (index + 1) + " · " + errorText(problem));
          }
        }
      } else {
      if (useSample) {
        content = JSON.stringify(sampleFeed);
      } else if (feedFile) {
        if (feedFile.size > maxFeedBytes) throw new Error("Feed je veći od 8 MB.");
        content = await feedFile.text();
      } else {
        const source = new URL(xmlFeedDraft.trim());
        if (source.protocol !== "https:" || source.username || source.password) {
          throw new Error("Unesite javnu HTTPS poveznicu bez korisničkih podataka.");
        }
        let response: Response;
        try {
          response = await fetch(source, { credentials: "omit", signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error("Feed nije dostupan.");
          base = response.url;
        } catch {
          const result = await importClassifieds({ url: source.href, feed: true });
          if (!result.content) throw new Error(result.message || "Feed nije dostupan za izravan uvoz. Preuzmite ga i učitajte datoteku.");
          response = new Response(result.content);
          base = result.source || source.href;
        }
        content = await readFeedResponse(response);
      }
      parsed = await parseDealershipFeed(content, seller, base);
      }
      const ownedByVin = new Map(account.listings.filter(vehicle => vehicle.vin).map(vehicle => [vehicle.vin, vehicle]));
      const otherVins = new Set(inventory.filter(vehicle => vehicle.vin && vehicle.dealershipId !== account.id &&
        !ownedByVin.has(vehicle.vin)).map(vehicle => vehicle.vin));
      const eligible = parsed.vehicles.filter(vehicle => !otherVins.has(vehicle.vin)).map(vehicle => ({
        ...vehicle, id: ownedByVin.get(vehicle.vin)?.id ?? vehicle.id,
      }));
      const seenVins = new Set<string>();
      const vehicles = [...new Map(eligible.filter(vehicle => {
        if (!vehicle.vin) return true;
        if (seenVins.has(vehicle.vin)) return false;
        seenVins.add(vehicle.vin);
        return true;
      }).map(vehicle => [vehicle.id, vehicle])).values()];
      setFeedPreview({ ...parsed, vehicles, skipped: parsed.skipped + parsed.vehicles.length - vehicles.length, sample: useSample });
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setFeedProgress("");
      setBusy(false);
    }
  }

  const canPublishSample = !isSupabaseConfigured && localDemo();

  async function publishFeed() {
    if (!feedPreview || (feedPreview.sample && !canPublishSample)) return;
    setBusy(true);
    setError("");
    setMessage("");
    const failed: FeedVehicle[] = [];
    let lastError = "";
    try {
      for (const vehicle of feedPreview.vehicles) {
        try {
          await api("listing/save", { vehicle, status: "active" });
        } catch (problem) {
          failed.push(vehicle);
          lastError = errorText(problem);
        }
      }
      setFeedPreview(failed.length ? { ...feedPreview, vehicles: failed } : undefined);
      const published = feedPreview.vehicles.length - failed.length;
      if (published) setMessage("Objavljeni oglasi: " + number(published) + ".");
      if (failed.length) setError("Neuspjeli oglasi: " + number(failed.length) + ". " + lastError);
      await refresh();
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }
  function openBoost(listing: OwnedListing) {
    setError("");
    setConfirm({ kind: "boost", listing });
  }

  function changeStatus(listing: OwnedListing, status: ListingStatus) {
    return mutate("listing/save", { vehicle: listing, status }, "Status oglasa je ažuriran.");
  }

  async function sendChatMessage(textToSend = draftMsg) {
    const clean = textToSend.trim();
    if (!clean || !activeConversation || sendingMsg) return;
    setSendingMsg(true);
    setDraftMsg("");
    setError("");
    try {
      await api("message/send", { conversationId: activeConversation.id, body: clean });
      await refresh();
    } catch (problem) {
      setDraftMsg(clean);
      setError(errorText(problem));
    } finally {
      setSendingMsg(false);
    }
  }

  function exportData() {
    const { moderator: _m, ...portable } = account;
    const url = URL.createObjectURL(new Blob([JSON.stringify(portable, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "autoplac-moji-podaci.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const unreadMessagesCount = account.unreadCount ?? conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const savedCount = account.favorites.length;

  const filteredListings = useMemo(() => {
    if (listingFilter === "all") return account.listings;
    return account.listings.filter(l => l.status === listingFilter);
  }, [account.listings, listingFilter]);

  const savedVehiclesList = useMemo(() => {
    return account.favorites.map(fav => ({
      fav,
      vehicle: inventory.find(v => v.id === fav.id),
    }));
  }, [account.favorites, inventory]);

  const compareVehicles = useMemo(
    () => inventory.filter(v => compareIds.includes(v.id)).slice(0, 3),
    [inventory, compareIds],
  );

  const tabs: Array<{ key: AccountTabKey; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: "pregled", label: "Analitika i oglasi", icon: <LayoutDashboard size={15} /> },
    { key: "poruke", label: "Poruke i upiti", icon: <MessageSquare size={15} />, badge: (unreadMessagesCount + analytics.unread) || undefined },
    ...(account.profile.type === "dealer"
      ? [{ key: "b2b" as const, label: "B2B Paket (30 dana 0 €)", icon: <Building2 size={15} /> }]
      : []),
    { key: "postavke", label: "Postavke profila / Salona", icon: <Settings size={15} /> },
  ];

  const initials = account.profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || "")
    .join("") || "AP";

  return (
    <main className="shell account-shell seller-center flex flex-col gap-4 max-w-[1200px]">
      <header className="detail-panel rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center font-bold text-[15px] shrink-0">
            {account.profile.avatarUrl ? (
              <img src={account.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="!m-0 text-[20px] font-bold text-[var(--text)] truncate">{account.profile.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--hover)] text-[11px] font-semibold text-[var(--spec)]">
                {account.profile.type === "dealer" ? (
                  <>
                    <Building2 size={12} className="text-[#2563EB]" /> Autokuća B2B
                  </>
                ) : (
                  <>
                    <UserRound size={12} className="text-[#2563EB]" /> Privatni račun
                  </>
                )}
              </span>
              {account.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={12} /> Verificiran
                </span>
              )}
            </div>
            <p className="text-[13px] text-[var(--muted)] !m-0 truncate">
              {account.email} · {account.profile.city}
              {account.profile.type === "dealer" && account.profile.subdomain ? ` · ${account.profile.subdomain}.autoplac.hr` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn primary" onClick={() => onPublish()}>
            <Plus size={15} /> Predaj novi oglas
          </button>
          <button className="btn secondary" type="button" onClick={signOut}>
            Odjava
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-2.5" aria-label="Odjeljci računa">
        {tabs.map(item => {
          const active = tab === item.key || (item.key === "pregled" && tab === "oglasi");
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setTab(item.key);
                setError("");
                setMessage("");
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                active
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-[var(--surface)] text-[var(--spec)] border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-[var(--hover)] text-[var(--text)] border border-[var(--border)]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        {account.moderator && (
          <button
            aria-pressed={tab === "moderiranje"}
            type="button"
            onClick={async () => {
              setTab("moderiranje");
              try {
                setReports(await api<Report[]>("moderation"));
              } catch (problem) {
                setError(errorText(problem));
              }
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
              tab === "moderiranje"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "bg-[var(--surface)] text-[var(--spec)] border-[var(--border)] hover:bg-[var(--hover)]"
            }`}
          >
            DSA moderiranje
          </button>
        )}
      </nav>

      {boostNotice && <div className="toast" role="status"><Check size={17} aria-hidden="true" />{boostNotice}
        <button type="button" className="icon-btn listing-boost-action" aria-label="Zatvori obavijest" onClick={() => setBoostNotice("")}><X size={15} aria-hidden="true" /></button>
      </div>}
      {message && (
        <p className="calculation !m-0" role="status">
          {message}
        </p>
      )}
      {error && !confirm && (
        <p className="form-error !m-0" role="alert">
          {error}
        </p>
      )}

      {analyticsError && (tab === "pregled" || tab === "poruke" || tab === "b2b") && <p className="form-error" role="alert">{analyticsError}</p>}
      {tab === "pregled" && <AnalyticsOverview data={analytics} account={account} open={openAnalyticsListing}
        onEdit={onPublish} onSheet={setSheet} onBoost={openBoost} onPause={listing => void changeStatus(listing, "paused")}
        onDelete={listing => setConfirm({ kind: "delete-listing", listing })} onManage={() => setTab("oglasi")} />}
      {sheet && <WindshieldSheet vehicle={sheet} phone={account.profile.phone} onClose={() => setSheet(undefined)} />}

      {/* TAB 2: MOJI OGLASI */}
      {tab === "oglasi" && (
        <section className="detail-panel rounded-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="!m-0 text-[17px] font-bold">Moji oglasi</h2>
              <p className="text-[12.5px] text-[var(--muted)] mt-0.5 !m-0">
                Upravljajte aktivnim, pauziranim i prodanim vozilima.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", "Svi"],
                  ["active", "Aktivni"],
                  ["paused", "Pauzirani"],
                  ["sold", "Prodani"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setListingFilter(key)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold border transition-colors ${
                    listingFilter === key
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-[var(--hover)] text-[var(--spec)] border-[var(--border)]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button className="btn primary ml-1" type="button" onClick={() => onPublish()}>
                <Plus size={15} /> Predaj oglas
              </button>
            </div>
          </div>


          {filteredListings.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-[var(--border)]">
              <p className="text-[13.5px] text-[var(--muted)] !m-0">Nema oglasa u odabranom filtru.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredListings.map(listing => {
                const badge = statusLabels[listing.status] ?? statusLabels.active;
                return (
                  <article
                    key={listing.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--hover)] flex flex-col md:flex-row gap-3.5 items-start md:items-center"
                  >
                    <div className="w-full md:w-[156px] aspect-[16/10] shrink-0 rounded-lg overflow-hidden border border-[var(--border)]">
                      <VehiclePhoto photo={listing.photos[0]} alt={listing.title} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.tone}`}>
                          {badge.label}
                        </span>
                        <h3 className="!m-0 text-[15px] font-bold text-[var(--text)] truncate">
                          {listing.status === "active" ? (
                            <a
                              href={vehicleListingPath(listing.id)}
                              onClick={e => {
                                if (onOpenListing) {
                                  e.preventDefault();
                                  onOpenListing(listing.id);
                                }
                              }}
                              className="hover:underline"
                            >
                              {listing.title}
                            </a>
                          ) : (
                            listing.title
                          )}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {listing.previousPriceEur && listing.previousPriceEur > listing.price && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold tabular-nums">
                            ↓ Pad cijene ({euro(listing.previousPriceEur)} → {euro(listing.price)})
                          </span>
                        )}
                        <strong className="text-[16px] font-extrabold tabular-nums text-[var(--text)] !m-0">
                          {euro(listing.price)}
                        </strong>
                        <span className="text-[12px] text-[var(--muted)] tabular-nums">
                          {registered(listing.date)} · {number(listing.km)} km
                        </span>
                      </div>

                      {editingPriceId === listing.id && (
                        <form
                          className="flex flex-wrap items-center gap-2 pt-1"
                          onSubmit={e => {
                            e.preventDefault();
                            const nextPrice = Math.round(Number(draftPriceEur));
                            if (!Number.isFinite(nextPrice) || nextPrice <= 0) return;
                            const prevPrice =
                              listing.price > nextPrice
                                ? listing.price
                                : listing.previousPriceEur;
                            setEditingPriceId(null);
                            void mutate(
                              "listing/save",
                              {
                                vehicle: {
                                  ...listing,
                                  price: nextPrice,
                                  previousPriceEur: prevPrice,
                                },
                                status: listing.status,
                              },
                              nextPrice < listing.price
                                ? `Cijena snižena na ${euro(nextPrice)} (oznaka Pad cijene aktivirana).`
                                : `Cijena ažurirana na ${euro(nextPrice)}.`,
                            );
                          }}
                        >
                          <input
                            type="number"
                            min={100}
                            max={10000000}
                            required
                            value={draftPriceEur}
                            onChange={e => setDraftPriceEur(e.target.value)}
                            aria-label="Nova cijena u EUR"
                            className="w-[130px] min-h-[34px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] tabular-nums"
                          />
                          <button type="submit" className="btn primary text-[12px]" disabled={busy}>
                            Spremi cijenu
                          </button>
                          <button
                            type="button"
                            className="btn quiet text-[12px]"
                            onClick={() => setEditingPriceId(null)}
                          >
                            Odustani
                          </button>
                        </form>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--muted)] tabular-nums">
                        <span>👁 {listing.views} pregleda</span>
                        <span>💬 {listing.inquiriesCount ?? 0} upita</span>
                        {listing.status === "active" && hasActiveBoost(listing) && (
                          <span className="font-semibold">
                            Istaknuto{listing.boostExpiresAt ? " do " + new Date(listing.boostExpiresAt).toLocaleDateString("hr-HR", { timeZone: "Europe/Zagreb" }) : ""}
                          </span>
                        )}
                      </div>

                      <PrivateListingValuation vehicle={listing} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="btn secondary text-[12.5px]"
                        onClick={() => {
                          setEditingPriceId(editingPriceId === listing.id ? null : listing.id);
                          setDraftPriceEur(String(listing.price));
                        }}
                      >
                        Uredi cijenu
                      </button>
                      <button type="button" className="btn secondary" onClick={() => setSheet(listing)}>A4 Cjenik za staklo</button>
                      <button type="button" className="btn secondary text-[12.5px]" onClick={() => onPublish(listing)}>
                        Uredi oglas
                      </button>
                      {listing.status === "active" && (
                        <button className="btn secondary listing-boost-action" type="button" disabled={busy} onClick={() => openBoost(listing)}>
                          <Zap size={15} aria-hidden="true" /> Istakni oglas
                        </button>
                      )}
                      {listing.status === "active" && (
                        <button
                          type="button"
                          className="btn secondary text-[12.5px]"
                          disabled={busy}
                          onClick={() => void changeStatus(listing, "paused")}
                        >
                          <Pause size={13} /> Pauziraj
                        </button>
                      )}
                      {(listing.status === "paused" || listing.status === "draft") && (
                        <button
                          type="button"
                          className="btn secondary text-[12.5px]"
                          disabled={busy}
                          onClick={() => void changeStatus(listing, "active")}
                        >
                          <Play size={13} /> Aktiviraj
                        </button>
                      )}
                      {listing.status !== "sold" && (
                        <button
                          type="button"
                          className="btn secondary text-[12.5px]"
                          disabled={busy}
                          onClick={() => void changeStatus(listing, "sold")}
                        >
                          <Check size={13} /> Označi kao prodano
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn quiet text-[12.5px] danger"
                        onClick={() => {
                          setError("");
                          setConfirm({ kind: "delete-listing", listing });
                        }}
                      >
                        Obriši
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: PORUKE */}
      {tab === "poruke" && <div className="seller-inbox-switch" role="group" aria-label="Vrsta poruka">
        <button type="button" className="btn secondary" aria-pressed={inboxMode === "leads"} onClick={() => setInboxMode("leads")}>Upiti s oglasa</button>
        <button type="button" className="btn secondary" aria-pressed={inboxMode === "chat"} onClick={() => setInboxMode("chat")}>Razgovori</button>
      </div>}
      {tab === "poruke" && inboxMode === "leads" && <LeadInbox items={analytics.inquiries} listings={account.listings} reload={loadAnalytics} />}
      {tab === "poruke" && inboxMode === "chat" && (
        <section className="detail-panel rounded-xl p-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)] min-h-[520px]">
          <aside
            className={`border-b lg:border-b-0 lg:border-r border-[var(--border)] flex flex-col ${
              mobileShowChat ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="!m-0 text-[15px] font-bold">Razgovori ({conversations.length})</h2>
              {unreadMessagesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#2563EB]/15 text-[#2563EB] text-[11px] font-bold tabular-nums">
                  {unreadMessagesCount} novih
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {conversations.length === 0 ? (
                <p className="p-4 text-[13px] text-[var(--muted)]">
                  Nemate razgovora. Otvorite oglas i kliknite &ldquo;Pošalji poruku prodavaču&rdquo;.
                </p>
              ) : (
                conversations.map(conv => {
                  const selected = activeConversation?.id === conv.id;
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors ${
                        selected ? "bg-[#2563EB]/10" : "hover:bg-[var(--hover)]"
                      }`}
                    >
                      <div className="w-[54px] h-[38px] shrink-0 rounded overflow-hidden border border-[var(--border)] bg-[var(--hover)]">
                        {conv.vehicleImage ? (
                          <img src={conv.vehicleImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <CarFront size={16} className="m-auto mt-2.5 text-[var(--muted)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <strong className="text-[13px] font-semibold text-[var(--text)] truncate !m-0">
                            {conv.partnerName}
                          </strong>
                          {conv.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" aria-label="Nepročitano" />
                          )}
                        </div>
                        <p className="text-[12px] font-medium text-[var(--spec)] truncate !m-0">{conv.vehicleTitle}</p>
                        <p className="text-[11.5px] text-[var(--muted)] truncate mt-0.5 !m-0">
                          {lastMsg?.body || "Nema poruka"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className={`flex flex-col min-w-0 ${mobileShowChat ? "flex" : "hidden lg:flex"}`}>
            {activeConversation ? (
              <>
                <div className="p-3 border-b border-[var(--border)] bg-[var(--hover)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="icon-btn lg:hidden"
                      aria-label="Natrag na listu razgovora"
                      onClick={() => setMobileShowChat(false)}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="w-[62px] h-[44px] shrink-0 rounded-md overflow-hidden border border-[var(--border)]">
                      {activeConversation.vehicleImage ? (
                        <img src={activeConversation.vehicleImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <CarFront size={18} className="m-auto mt-3 text-[var(--muted)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="!m-0 text-[14px] font-bold text-[var(--text)] truncate">
                        {activeConversation.vehicleTitle}
                      </h3>
                      <p className="text-[12px] text-[var(--muted)] !m-0 tabular-nums">
                        <strong className="text-[var(--text)] !m-0">{euro(activeConversation.vehiclePriceEur)}</strong> ·{" "}
                        {activeConversation.partnerName}
                      </p>
                    </div>
                  </div>
                  <a
                    href={vehicleListingPath(activeConversation.vehicleId)}
                    onClick={e => {
                      if (onOpenListing) {
                        e.preventDefault();
                        onOpenListing(activeConversation.vehicleId);
                      }
                    }}
                    className="btn secondary text-[12px] shrink-0"
                  >
                    Otvori oglas →
                  </a>
                </div>

                <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-2.5 max-h-[380px]">
                  {activeConversation.messages.length === 0 ? (
                    <p className="text-[13px] text-[var(--muted)] m-auto text-center">
                      Pošaljite prvu poruku ili odaberite brzi odgovor ispod.
                    </p>
                  ) : (
                    activeConversation.messages.map(msg => {
                      const mine = msg.senderId === account.id;
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[82%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed ${
                            mine
                              ? "self-end bg-[#2563EB] text-white"
                              : "self-start bg-[var(--hover)] border border-[var(--border)] text-[var(--text)]"
                          }`}
                        >
                          <p className="!m-0 whitespace-pre-wrap">{msg.body}</p>
                          <span
                            className={`block text-[11px] mt-1 tabular-nums ${
                              mine ? "text-blue-100 text-right" : "text-[var(--muted)]"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })}
                            {mine && (msg.isRead ? " · Pročitano" : " · Poslano")}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 border-t border-[var(--border)] flex flex-col gap-2 bg-[var(--surface)]">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map(reply => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => void sendChatMessage(reply)}
                        className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--hover)] hover:border-[#2563EB] text-[11.5px] font-medium text-[var(--spec)] transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={e => {
                      e.preventDefault();
                      void sendChatMessage();
                    }}
                  >
                    <input
                      value={draftMsg}
                      onChange={e => setDraftMsg(e.target.value)}
                      placeholder="Napišite poruku prodavaču ili kupcu…"
                      maxLength={1000}
                      className="flex-1 min-w-0 min-h-[38px] rounded-lg border border-[var(--border)] bg-[var(--hover)] px-3 text-[13.5px] text-[var(--text)]"
                    />
                    <button type="submit" className="btn primary min-h-[38px]" disabled={sendingMsg || !draftMsg.trim()}>
                      <Send size={15} /> Pošalji
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="m-auto p-6 text-center text-[var(--muted)] text-[13.5px]">
                Odaberite razgovor s lijeve strane.
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: SPREMLJENO / FAVORITI */}
      {tab === "favoriti" && (
        <section className="detail-panel rounded-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="!m-0 text-[17px] font-bold">Spremljena vozila i praćenje cijena</h2>
              <p className="text-[12.5px] text-[var(--muted)] mt-0.5 !m-0">
                Označite do 3 vozila za detaljnu usporedbu ili uključite obavijest o padu cijene.
              </p>
            </div>
            <button
              type="button"
              disabled={compareVehicles.length < 2}
              onClick={() => setShowCompare(true)}
              className="btn primary"
            >
              <Scale size={15} /> Usporedi odabrana vozila ({compareVehicles.length}/3)
            </button>
          </div>

          {!savedVehiclesList.length ? (
            <p className="text-[13.5px] text-[var(--muted)] !m-0">Još nemate spremljenih vozila.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {savedVehiclesList.map(({ fav, vehicle }) => {
                const checkedForCompare = compareIds.includes(fav.id);
                const priceDrop = vehicle && fav.price > 0 && vehicle.price < fav.price ? fav.price - vehicle.price : 0;
                return (
                  <article
                    key={fav.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--hover)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {vehicle && (
                        <Checkbox
                          aria-label={`Odaberi za usporedbu: ${vehicle.title}`}
                          checked={checkedForCompare}
                          disabled={!checkedForCompare && compareIds.length >= 3}
                          onChange={e =>
                            setCompareIds(old =>
                              e.target.checked ? [...old, fav.id].slice(0, 3) : old.filter(id => id !== fav.id),
                            )
                          }
                        />
                      )}
                      {vehicle && (
                        <div className="w-[88px] h-[60px] shrink-0 rounded-md overflow-hidden border border-[var(--border)]">
                          <VehiclePhoto photo={vehicle.photos[0]} alt={vehicle.title} />
                        </div>
                      )}
                      <div className="min-w-0">
                        {vehicle ? (
                          <>
                            <a
                              href={vehicleListingPath(vehicle.id)}
                              onClick={e => {
                                if (onOpenListing) {
                                  e.preventDefault();
                                  onOpenListing(vehicle.id);
                                }
                              }}
                              className="text-[14px] font-bold text-[var(--text)] hover:underline truncate block"
                            >
                              {vehicle.title}
                            </a>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 tabular-nums">
                              <strong className="text-[15px] font-extrabold text-[var(--text)] !m-0">
                                {euro(vehicle.price)}
                              </strong>
                              {priceDrop > 0 && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11.5px] font-semibold">
                                  ↓ Pad cijene {euro(priceDrop)}
                                </span>
                              )}
                              <span className="text-[12px] text-[var(--muted)]">
                                {registered(vehicle.date)} · {number(vehicle.km)} km · {vehicle.city}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-[13px] text-[var(--muted)] !m-0">Oglas više nije dostupan.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--spec)] cursor-pointer">
                        <Checkbox
                          checked={fav.priceAlert !== false}
                          onChange={e =>
                            void mutate(
                              "favorite",
                              { id: fav.id, priceAlert: e.target.checked },
                              "Obavijest o cijeni je ažurirana.",
                            )
                          }
                        />
                        <Bell size={13} className="text-[#2563EB]" />
                        <span>Obavijest o padu cijene</span>
                      </label>
                      <button
                        type="button"
                        className="btn secondary text-[12.5px]"
                        disabled={busy}
                        onClick={() => void mutate("favorite", { id: fav.id, saved: false }, "Oglas je uklonjen iz spremljenih.")}
                      >
                        Ukloni
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 4B: B2B PAKET I XML UVOZ (DEALERSHIP ACCOUNTS) */}
      {tab === "b2b" && account.profile.type === "dealer" && (
        <div className="flex flex-col gap-4">
          <TrialReport data={analytics} name={account.profile.name} startedAt={account.profile.trialStartedAt} />
          <section className="detail-panel rounded-xl flex flex-col gap-3.5">
            <div>
              <h2 className="!m-0 text-[17px] font-bold">Povelja za autokuće · B2B paketi</h2>
              <p className="text-[12.5px] text-[var(--muted)] mt-0.5 !m-0">
                Transparentni mjesečni paketi bez ugovorne obveze. {B2B_FOUNDER_OFFER}.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {B2B_PACKAGES.map(plan => {
                const active = selectedTier === plan.id && Boolean(account.profile.trialStartedAt);
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                      active
                        ? "border-[#2563EB] bg-blue-500/10"
                        : "border-[var(--border)] bg-[var(--hover)]"
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-[15px] font-bold text-[var(--text)] !m-0">{plan.name}</strong>
                        <span className="text-[13px] font-semibold tabular-nums">{plan.priceEur} €/mj.</span>
                      </div>
                      <p className="tabular font-bold">{B2B_FOUNDER_OFFER}</p>
                      <p className="text-[12.5px] text-[var(--muted)] leading-relaxed !m-0">{plan.desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || active}
                      onClick={() => void mutate("salon/plan", { tier: plan.id }, `B2B paket "${plan.name}" je odabran.`)}
                      className={`btn w-full text-[12.5px] ${active ? "secondary" : "primary"}`}
                    >
                      {active ? "Trenutačni paket" : `Aktiviraj ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="detail-panel rounded-xl form-stack feed-import">
            <h2 className="!m-0 text-[17px] font-bold">Skupni uvoz vozila</h2>
            <p className="text-[var(--muted)]">Unesite XML/JSON feed, učitajte datoteku ili zalijepite poveznice pojedinačnih oglasa.</p>
            <form className="form-stack" onSubmit={event => {
              event.preventDefault();
              void previewFeed(!xmlFeedDraft.trim() && !feedFile && !classifiedLinks.trim());
            }}>
              <label className="field">
                <span>HTTPS poveznica</span>
                <input type="url" disabled={busy} value={xmlFeedDraft} onChange={event => {
                  setXmlFeedDraft(event.target.value);
                  setFeedPreview(undefined);
                }} placeholder="https://vas-salon.hr/export/vozila.xml" maxLength={500} />
              </label>
              <label className="field">
                <span>Datoteka feeda</span>
                <input type="file" disabled={busy} accept=".xml,.json,.html,.htm" onChange={event => {
                  setFeedFile(event.target.files?.[0]);
                  setFeedPreview(undefined);
                }} />
              </label>
              <label className="field">
                <span>Poveznice pojedinačnih oglasa</span>
                <textarea rows={4} maxLength={42000} value={classifiedLinks} disabled={busy}
                  placeholder="Jedna HTTPS poveznica po retku" onChange={event => {
                    setClassifiedLinks(event.target.value);
                    setFeedPreview(undefined);
                  }} />
              </label>
              {feedProgress && <p className="tabular-nums" role="status">{feedProgress}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn primary" disabled={busy}>Pregledaj uvoz</button>
                <button type="button" className="btn secondary" disabled={busy} onClick={() => void previewFeed(true)}>Učitaj probni feed</button>
                <button type="button" className="btn secondary" disabled={busy} onClick={() => void mutate(
                  "profile", { ...account.profile, importUrl: xmlFeedDraft.trim(), type: "dealer" }, "Poveznica feeda je spremljena.",
                )}>Spremi poveznicu</button>
              </div>
            </form>
            {feedPreview && <div className="form-stack" aria-live="polite">
              <h3>{feedPreview.sample ? "Primjer zalihe autokuće iz Osijeka" : "Pregled oglasa za objavu"}</h3>
              <p className="tabular">{number(feedPreview.vehicles.length)} za objavu · {number(feedPreview.skipped)} preskočeno</p>
              {feedPreview.issues.length > 0 && <details>
                <summary>Razlozi preskakanja</summary>
                <ul>{feedPreview.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
              </details>}
              <ul className="feed-preview-list">
                {feedPreview.vehicles.map(vehicle => <li key={vehicle.id}>
                  <span>{vehicle.title} <small className="tabular">{registered(vehicle.date)} · {number(vehicle.km)} km</small></span>
                  <strong className="tabular">{euro(vehicle.price)}</strong>
                  <Rating valuation={marketValuation(vehicle)} privateContext />
                </li>)}
              </ul>
              {feedPreview.sample && !canPublishSample ? <p>Za objavu učitajte stvarnu zalihu svoje autokuće.</p> :
                <button type="button" className="btn primary self-start" disabled={busy || !feedPreview.vehicles.length} onClick={() => void publishFeed()}>
                  Objavi oglase <span className="tabular">({number(feedPreview.vehicles.length)})</span>
                </button>}
            </div>}
          </section>
        </div>
      )}

      {/* TAB 5: PROFIL I POSTAVKE */}
      {tab === "postavke" && (
        <div className="form-stack">
          <section className="detail-panel rounded-xl form-stack">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="!m-0 text-[17px] font-bold">Podaci profila i salona</h2>
              {account.profile.type === "dealer" && (
                <a
                  href={"/?salon=" + encodeURIComponent(account.id)}
                  className="btn secondary text-[12.5px]"
                >
                  Pregledaj javni profil ({account.profile.subdomain || "salon"}.autoplac.hr)
                </a>
              )}
            </div>
            <form
              className="form-stack"
              noValidate
              onSubmit={event => {
                event.preventDefault();
                const data = formData(event);
                const fields = profileErrors(data, account.profile.type === "dealer");
                if (typeof data.importUrl === "string" && data.importUrl.trim()) {
                  try {
                    const url = new URL(data.importUrl.trim());
                    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
                  } catch { fields.importUrl = "Unesite javnu HTTPS poveznicu."; }
                }
                if (!data.postalCode && data.city) delete fields.postalCode;
                setProfileIssues(fields);
                if (!Object.keys(fields).length) {
                  void mutate("profile", { ...data, type: account.profile.type }, "Profil je spremljen.");
                }
              }}
            >
              <ProfileFields type={account.profile.type} profile={account.profile} errors={profileIssues} />
              {account.profile.type === "dealer" && <div className="search-fields">
                <label className="field"><span>WhatsApp broj</span><input name="whatsappPhone" type="tel" defaultValue={account.profile.whatsappPhone} maxLength={40} /></label>
                <label className="field"><span>XML / web feed URL</span><input name="importUrl" type="url" defaultValue={account.profile.importUrl} maxLength={500} aria-invalid={Boolean(profileIssues.importUrl)} />{profileIssues.importUrl && <small className="field-error">{profileIssues.importUrl}</small>}</label>
              </div>}
              <button className="btn primary justify-self-start" disabled={busy}>
                Spremi profil
              </button>
            </form>
            <button type="button" className="btn secondary self-start" onClick={() => setTab("favoriti")}>Spremljeni oglasi</button>
          </section>

          <section className="detail-panel rounded-xl form-stack">
            <h2 className="!m-0 text-[17px] font-bold">Obavijesti putem e-pošte</h2>
            <form
              className="form-stack"
              onSubmit={event => {
                event.preventDefault();
                const data = formData(event);
                void mutate(
                  "profile",
                  {
                    emailNotifications: !!data.emailNotifications,
                    priceAlertEmails: !!data.priceAlertEmails,
                    alerts: !!data.priceAlertEmails,
                  },
                  "Postavke obavijesti su spremljene.",
                );
              }}
            >
              <div className="account-checks">
                <label>
                  <Checkbox
                    name="emailNotifications"
                    defaultChecked={account.profile.emailNotifications !== false}
                  />
                  Obavijesti o novim porukama na e-mail
                </label>
                <label>
                  <Checkbox
                    name="priceAlertEmails"
                    defaultChecked={account.profile.priceAlertEmails !== false}
                  />
                  Obavijesti o padu cijene favorita
                </label>
              </div>
              <button className="btn secondary justify-self-start" disabled={busy}>
                Spremi postavke obavijesti
              </button>
            </form>
          </section>

          <section className="detail-panel rounded-xl form-stack">
            <h2 className="!m-0 text-[17px] font-bold">Promjena lozinke</h2>
            <form
              className="form-stack"
              onSubmit={event => {
                event.preventDefault();
                const form = event.currentTarget;
                void mutate("password", formData(event), "Lozinka je promijenjena.").then(() => form.reset());
              }}
            >
              <div className="form-grid">
                <label className="field">
                  <span>Trenutačna lozinka</span>
                  <input name="current" type="password" autoComplete="current-password" required maxLength={128} />
                </label>
                <label className="field">
                  <span>Nova lozinka (min. 8 znakova)</span>
                  <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
                </label>
              </div>
              <button className="btn primary justify-self-start" disabled={busy}>
                Promijeni lozinku
              </button>
            </form>
          </section>

          <section className="detail-panel rounded-xl form-stack">
            <h2 className="!m-0 text-[17px] font-bold">Privatnost i GDPR</h2>
            <div className="account-actions">
              <button className="btn secondary" type="button" onClick={exportData}>
                Preuzmi moje podatke (JSON)
              </button>
              <button className="btn secondary" type="button" onClick={openPrivacySettings}>
                Postavke kolačića
              </button>
              <button
                className="btn secondary danger"
                type="button"
                onClick={() => {
                  setError("");
                  setConfirm({ kind: "delete-account" });
                }}
              >
                Trajno obriši račun i sve oglase
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "moderiranje" && account.moderator && (
        <section className="detail-panel rounded-xl form-stack">
          <h2>DSA prijave</h2>
          {reports.map(report => (
            <article key={report.id} className="calculation">
              <div>
                <strong>{report.reason}</strong>
                <p>{report.details}</p>
                <p>
                  {report.email || "Anonimna prijava"} · {report.status}
                </p>
                <a className="legal-link" href={report.url}>
                  Otvori prijavljeni oglas
                </a>
              </div>
              {report.status === "pending" && (
                <div className="form-stack">
                  <label className="field">
                    <span>Obrazloženje odluke</span>
                    <textarea onChange={event => setDecision(event.target.value)} />
                  </label>
                  <div className="account-actions">
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate("moderation", { id: report.id, decision, status: "dismissed" }, "Odluka je spremljena.")
                      }
                    >
                      Odbaci prijavu
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate("moderation", { id: report.id, decision, status: "removed" }, "Oglas je povučen.")
                      }
                    >
                      Povuci oglas
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {showCompare && (
        <ComparisonModal
          vehicles={compareVehicles}
          onClose={() => setShowCompare(false)}
          onOpenListing={id => {
            if (onOpenListing) onOpenListing(id);
            else window.location.href = vehicleListingPath(id);
          }}
        />
      )}

      {confirm?.kind === "boost" && (
        <Dialog title="Istakni oglas" variant="form-dialog" onClose={() => setConfirm(undefined)}>
          <div className="dialog-content form-stack">
            <p className="font-semibold">{confirm.listing.title}</p>
            {hasActiveBoost(confirm.listing) ? <p>Oglas već ima aktivno isticanje.</p> : (
              <>
                <p>Osnove: {B2B_FOUNDER_OFFER}. Nakon isteka promocije prikazane su cijene paketa.</p>
                <div className="listing-boost-plans">
                  {(Object.entries(boostPlans) as [PaidBoostTier, (typeof boostPlans)[PaidBoostTier]][]).map(([tier, plan]) => (
                    <section key={tier} className="listing-boost-plan">
                      <h3 className="tabular">{plan.name} · <s>{euro(plan.price, true)}</s> <strong>{euro(0)}</strong></h3>
                      <p>{plan.description}</p>
                      <button className="btn secondary listing-boost-action" type="button" disabled={busy} onClick={() =>
                        void mutate("listing/boost", { id: confirm.listing.id, tier }, "Isticanje je aktivirano · " + plan.name + ".")}>
                        Aktiviraj · {plan.name}
                      </button>
                    </section>
                  ))}
                </div>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
        </Dialog>
      )}

      {confirm && confirm.kind !== "boost" && (
        <Dialog title={confirm.kind === "delete-account" ? "Trajno brisanje računa" : "Obriši oglas"}
          variant="form-dialog" onClose={() => setConfirm(undefined)}>
          <form
            className="dialog-content form-stack"
            onSubmit={event => {
              event.preventDefault();
              if (confirm.kind === "delete-account") void mutate("account/delete", formData(event), "Račun je obrisan.");
              else void mutate("listing/delete", { id: confirm.listing.id }, "Oglas je obrisan.");
            }}
          >
            <p>{confirm.kind === "delete-account"
              ? "Račun, svi vaši oglasi i spremljena vozila bit će trajno obrisani."
              : "Oglas će biti trajno uklonjen iz vašeg računa."}</p>
            {confirm.kind === "delete-account" && (
              <label className="field">
                <span>Potvrdite lozinku</span>
                <input required name="password" type="password" autoComplete="current-password" />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="account-actions">
              <button className="btn secondary" type="button" onClick={() => setConfirm(undefined)}>
                Odustani
              </button>
              <button className="btn primary" disabled={busy}>
                Trajno obriši
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </main>
  );
}

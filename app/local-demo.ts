import { normalizePhone, profileErrors } from "../src/data/profile-validation";
import { formatHours, presetHours, validHours } from "../src/data/working-hours";
import type { Account, Conversation, LeadEvent, ListingLead, OwnedListing, Profile, SellerAnalytics } from "./account-api";
import { modelPhotos, vehicles, type Vehicle } from "./catalog";
import { boostPriority, hasActiveBoost } from "./listing-boost";

type LocalAccount = Account & {
  salt: string;
  password: string;
  used: Record<string, string[]>;
  otpUntil?: number;
  emailVerified?: boolean;
  analyticsSeeded?: boolean;
};
type LocalStore = {
  accounts: LocalAccount[];
  active?: string;
  reports?: string[];
  leads?: DemoLead[];
};

type DemoLead = ListingLead & { sellerId: string; session: string; device?: string; source?: string };

function seedSellerAnalytics(state: LocalStore, owner: LocalAccount) {
  if (owner.analyticsSeeded) return;
  owner.analyticsSeeded = true;
  if (!owner.listings.length) {
    owner.listings = vehicles.slice(0, 3).map(vehicle => ({
      ...vehicle, id: crypto.randomUUID(), seller: owner.profile.name, phone: owner.profile.phone,
      dealer: owner.profile.type === "dealer", verified: owner.verified,
      demo: true, status: "active", views: 0, reveals: 0,
    }));
  }
  const leads = state.leads ??= [];
  owner.listings.filter(item => item.status === "active").slice(0, 3).forEach((item, index) => {
    const baseline: [LeadEvent, number][] = [["view", 82 - index * 13], ["phone_reveal", 9 - index * 2], ["whatsapp", 5 - index], ["message", 1]];
    for (const [event, total] of baseline) {
      for (let offset = 0; offset < total; offset++) {
        const sample = event === "message";
        leads.push({
          id: crypto.randomUUID(), sellerId: owner.id, listing_id: item.id, session: crypto.randomUUID(),
          event_type: event, created_at: new Date(Date.now() - (offset + index + 1) * (sample ? 60 : 300) * 60000).toISOString(),
          is_read: !sample || index > 0, replies: [],
          ...(sample ? { buyer_name: ["Ana Kovač", "Ivan Horvat", "Petra Marić"][index],
            buyer_email: "kupac" + (index + 1) + "@example.test",
            message_text: ["Je li vozilo još dostupno za probnu vožnju?", "Možete li poslati servisnu povijest?", "Je li moguć pregled u subotu?"][index] } : {}),
        });
      }
      if (event === "view") item.views += total;
      if (event === "phone_reveal") item.reveals += total;
    }
  });
}

function demoSellerAnalytics(leads: DemoLead[], sellerId: string): SellerAnalytics {
  const owned = leads.filter(item => item.sellerId === sellerId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const recent = Date.now() - 30 * 86400000;
  const byListing = new Map<string, SellerAnalytics["metrics"][number]>();
  const counters = { view: "views", phone_reveal: "phone", whatsapp: "whatsapp", message: "messages" } as const;
  for (const item of owned) {
    if (Date.parse(item.created_at) < recent) continue;
    const metric = byListing.get(item.listing_id) ?? { listingId: item.listing_id, views: 0, phone: 0, whatsapp: 0, messages: 0 };
    metric[counters[item.event_type]]++;
    byListing.set(item.listing_id, metric);
  }
  const inquiries = owned.filter(item => item.event_type === "message");
  return { metrics: [...byListing.values()], inquiries: inquiries.slice(0, 200),
    activity: owned.filter(item => item.event_type === "phone_reveal" || item.event_type === "whatsapp").slice(0, 25),
    unread: inquiries.filter(item => !item.is_read).length };
}

const key = "autoplac.local-demo.v1";
export const localDemo = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== "undefined" &&
  (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) ||
    window.location.hostname.endsWith(".trycloudflare.com"));

function slugifySubdomain(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}

export function demoCredentials(type: Profile["type"], unique = false) {
  const suffix = unique ? "-" + crypto.randomUUID().slice(0, 8) : "";
  return {
    type,
    name: type === "dealer" ? "Auto Centar Horvat" : "Marko Kovač",
    fullName: type === "dealer" ? "Ivan Horvat" : "Marko Kovač",
    companyName: type === "dealer" ? "Auto Centar Horvat d.o.o." : "",
    email: "test-" + type + suffix + "@example.test",
    password: "Autoplac-Test-12345",
    city: "Zagreb",
    postalCode: "10000",
    county: "Grad Zagreb",
    phone: type === "dealer" ? "099 000 0001" : "099 000 0002",
    oib: "12345678900",
    address: "Slavonska avenija 52",
    workingHours: presetHours(1),
    terms: true,
    declaration: true,
  };
}

async function derive(password: string, salt: string) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 600000 }, keyMat, 256);
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join("");
}

function makeProfile(data: Record<string, unknown>, type: Profile["type"]): Profile {
  const errors = profileErrors(data, type === "dealer");
  if (!data.postalCode && data.city) delete errors.postalCode;
  if (Object.keys(errors).length) throw Object.assign(new Error("Provjerite označena polja."), { fields: errors });
  const workingHours = typeof data.workingHours === "string" ? JSON.parse(data.workingHours) : data.workingHours;
  const resolvedHours = type === "dealer" ? (validHours(workingHours) ? workingHours : presetHours(0)) : undefined;
  const text = (name: string) => String(data[name] ?? "").trim();
  const displayName = type === "dealer" ? text("companyName") || text("name") : text("fullName") || text("name");
  return {
    type,
    name: displayName,
    fullName: text("fullName") || text("name"),
    companyName: type === "dealer" ? text("companyName") || text("name") : undefined,
    avatarUrl: text("avatarUrl") || undefined,
    city: text("city"),
    postalCode: text("postalCode") || "10000",
    county: text("county"),
    phone: normalizePhone(text("phone")),
    alerts: data.alerts !== false,
    analytics: data.analytics === true,
    emailNotifications: data.emailNotifications !== false,
    priceAlertEmails: data.priceAlertEmails !== false && data.alerts !== false,
    ...(type === "dealer" && resolvedHours
      ? {
          workingHours: resolvedHours,
          hours: formatHours(resolvedHours),
          oib: text("oib"),
          address: text("address"),
          subdomain: slugifySubdomain(displayName),
          importUrl: text("importUrl"),
          subscriptionTier: (["starter", "pro", "ai_partner"].includes(text("subscriptionTier"))
            ? text("subscriptionTier")
            : "starter") as Profile["subscriptionTier"],
          aiImpressions: Number(data.aiImpressions) || 1420,
        }
      : {}),
  };
}

const address = (profile: Profile) => profile.address && [profile.address, [profile.postalCode, profile.city].filter(Boolean).join(" ")].join(", ");
const publicListing = (item: OwnedListing, account: LocalAccount) => ({
  ...item,
  phone: "",
  contactAvailable: true,
  dealershipId: item.dealer ? account.id : undefined,
});

function seedDemoConversations(userId: string): Conversation[] {
  const nowMs = Date.now();
  const c1Id = crypto.randomUUID();
  const c2Id = crypto.randomUUID();
  const g20Img = modelPhotos("bmw-g20")[0]?.src;
  const a4Img = modelPhotos("audi-a4")[0]?.src;
  return [
    {
      id: c1Id,
      vehicleId: "g20",
      vehicleTitle: "BMW 320d G20 M-Sport xDrive",
      vehiclePriceEur: 24900,
      vehicleImage: g20Img,
      buyerId: userId,
      sellerId: "dealer-horvat",
      partnerName: "Auto Centar Horvat",
      partnerCity: "Zagreb",
      lastMessageAt: new Date(nowMs - 1000 * 60 * 18).toISOString(),
      unreadCount: 1,
      messages: [
        {
          id: crypto.randomUUID(),
          conversationId: c1Id,
          senderId: userId,
          body: "Pozdrav, je li BMW 320d G20 još dostupan za pregled u Zagrebu?",
          isRead: true,
          createdAt: new Date(nowMs - 1000 * 60 * 45).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          conversationId: c1Id,
          senderId: "dealer-horvat",
          body: "Dobar dan! Vozilo je dostupno u našem salonu na Slavonskoj aveniji 52. Možete doći danas do 18:00 ili sutra ujutro, a moguć je i pregled u ovlaštenom servisu.",
          isRead: false,
          createdAt: new Date(nowMs - 1000 * 60 * 18).toISOString(),
        },
      ],
    },
    {
      id: c2Id,
      vehicleId: "a4",
      vehicleTitle: "Audi A4 B9 40 TDI S line",
      vehiclePriceEur: 22850,
      vehicleImage: a4Img,
      buyerId: userId,
      sellerId: "dealer-kvarner",
      partnerName: "Kvarner Automobili",
      partnerCity: "Rijeka",
      lastMessageAt: new Date(nowMs - 1000 * 60 * 60 * 5).toISOString(),
      unreadCount: 0,
      messages: [
        {
          id: crypto.randomUUID(),
          conversationId: c2Id,
          senderId: userId,
          body: "Možete li poslati broj šasije (VIN) za Audi A4 B9?",
          isRead: true,
          createdAt: new Date(nowMs - 1000 * 60 * 60 * 6).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          conversationId: c2Id,
          senderId: "dealer-kvarner",
          body: "Naravno, šaljemo VIN u prilogu: WAUZZZF4XLA019283. Servisna knjižica je kompletna.",
          isRead: true,
          createdAt: new Date(nowMs - 1000 * 60 * 60 * 5).toISOString(),
        },
      ],
    },
  ];
}

function withInboxStats(account: LocalAccount): Account {
  const { salt: _s, password: _p, used: _u, otpUntil: _o, emailVerified: _ev, ...visible } = account;
  const conversations = (visible.conversations ?? []).map(c => ({
    ...c,
    unreadCount: c.messages.filter(m => !m.isRead && m.senderId !== visible.id).length,
  }));
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const listings = visible.listings.map(l => ({
    ...l,
    inquiriesCount: conversations.filter(c => c.vehicleId === l.id).length,
  }));
  return { ...visible, listings, conversations, unreadCount };
}

export async function localApi(endpoint: string, input: object = {}): Promise<unknown> {
  const data = input as Record<string, unknown>;
  const state: LocalStore = JSON.parse(localStorage.getItem(key) || '{"accounts":[]}');
  const save = () => {
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new Event("autoplac:inbox-sync"));
  };
  const account = state.accounts.find(item => item.id === state.active);
  const owners = () => state.accounts.flatMap(owner => owner.listings.filter(item => item.status === "active").map(item => ({ item, owner })));

  if (endpoint === "lead/log") {
    const found = owners().find(({ item }) => item.id === data.id);
    const event = data.event as LeadEvent;
    if (!found || !["view", "phone_reveal", "whatsapp", "message"].includes(event) || typeof data.session !== "string") {
      throw new Error("Oglas nije dostupan.");
    }
    const leads = state.leads ??= [];
    if (event === "view" && leads.some(item => item.listing_id === data.id && item.event_type === "view" && item.session === data.session)) return {};
    if (event !== "view" && leads.filter(item => item.sellerId === found.owner.id && item.event_type === event &&
      item.session === data.session && Date.parse(item.created_at) > Date.now() - 60000).length >= 12) {
      throw new Error("Pričekajte prije ponovnog slanja.");
    }
    const name = String(data.name ?? "").trim().slice(0, 70);
    const message = String(data.message ?? "").trim().slice(0, 1200);
    const email = String(data.email ?? "").trim().slice(0, 160);
    const buyerPhone = String(data.phone ?? "").trim().slice(0, 40);
    if (event === "message" && (!name || !message || (!email && !buyerPhone) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (buyerPhone && !/^[+0-9 ()/.-]{6,40}$/.test(buyerPhone)))) {
      throw new Error("Provjerite ime, kontakt i poruku.");
    }
    const phone = event === "whatsapp" ? found.owner.profile.whatsappPhone || found.owner.profile.phone
      : event === "phone_reveal" ? found.owner.profile.phone : undefined;
    if ((event === "phone_reveal" || event === "whatsapp") && !phone) throw new Error("Broj nije dostupan.");
    const id = crypto.randomUUID();
    leads.push({ id, listing_id: found.item.id, sellerId: found.owner.id, session: data.session,
      event_type: event, created_at: new Date().toISOString(), is_read: event !== "message", replies: [],
      device: String(data.device ?? "").slice(0, 16), source: String(data.source ?? "").slice(0, 180),
      ...(event === "message" ? { buyer_name: name, buyer_phone: buyerPhone, buyer_email: email, message_text: message } : {}),
    });
    if (event === "view") found.item.views++;
    if (event === "phone_reveal") found.item.reveals++;
    if (event === "message") found.item.inquiriesCount = (found.item.inquiriesCount ?? 0) + 1;
    save();
    return { id, phone, demo: found.item.demo };
  }
  if (endpoint === "lead/thread") {
    return state.leads?.find(item => item.id === data.id && item.session === data.session && item.event_type === "message")?.replies ?? null;
  }
  if (endpoint === "lead/analytics" || endpoint === "lead/reply" || endpoint === "salon/plan") {
    if (!account) throw new Error("Prijavite se kako biste nastavili.");
    if (endpoint === "lead/analytics") return demoSellerAnalytics(state.leads ?? [], account.id);
    if (endpoint === "salon/plan") {
      const tier = data.tier as NonNullable<Profile["subscriptionTier"]>;
      if (account.profile.type !== "dealer" || !["starter", "pro", "ai_partner"].includes(tier)) throw new Error("Paket nije dostupan.");
      account.profile.subscriptionTier = tier;
      account.profile.trialStartedAt ??= new Date().toISOString();
      save();
      return account.profile.trialStartedAt;
    }
    const lead = state.leads?.find(item => item.id === data.id && item.sellerId === account.id && item.event_type === "message");
    if (!lead) throw new Error("Upit nije dostupan.");
    if (typeof data.reply === "string") {
      const reply = data.reply.trim();
      if (!reply || reply.length > 1200) throw new Error("Poruka nije valjana.");
      lead.replies.push({ text: reply, created_at: new Date().toISOString() });
    }
    lead.is_read = true;
    save();
    return { ok: true };
  }

  if (endpoint === "config") return { demoOtp: true };
  if (endpoint === "account") {
    if (!account) return null;
    return withInboxStats(account);
  }
  if (endpoint === "inventory") {
    const now = Date.now();
    return owners()
      .sort((a, b) => boostPriority(b.item, now) - boostPriority(a.item, now))
      .map(({ item, owner }) => publicListing(item, owner));
  }
  if (endpoint === "view" || endpoint === "phone") {
    const found = owners().find(({ item }) => item.id === data.id);
    if (!found) throw new Error("Oglas nije dostupan.");
    if (endpoint === "view") found.item.views++;
    else found.item.reveals++;
    save();
    return { phone: found.item.phone };
  }

  if (endpoint === "auth/google") {
    const email = "google.korisnik@gmail.com";
    let user = state.accounts.find(item => item.email === email);
    if (!user) {
      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      user = {
        id,
        email,
        profile: {
          type: "private",
          name: "Luka Marić",
          fullName: "Luka Marić",
          city: "Zagreb",
          postalCode: "10000",
          county: "Grad Zagreb",
          phone: "+385 91 555 0192",
          alerts: true,
          analytics: false,
          emailNotifications: true,
          priceAlertEmails: true,
        },
        salt,
        password: await derive(crypto.randomUUID(), salt),
        verified: true,
        emailVerified: true,
        moderator: false,
        listings: [],
        favorites: [],
        conversations: seedDemoConversations(id),
        used: {},
      };
      state.accounts.push(user);
    }
    state.active = user.id;
    save();
    return { ok: true };
  }

  if (endpoint === "auth/reset") {
    const email = String(data.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Unesite valjanu e-mail adresu.");
    return { ok: true };
  }

  if (endpoint === "auth/resend") {
    return { ok: true };
  }

  if (endpoint === "auth/verify-email-demo") {
    const email = String(data.email ?? "").trim().toLowerCase();
    const user = state.accounts.find(item => item.email === email);
    if (!user) throw new Error("Račun nije pronađen.");
    user.emailVerified = true;
    state.active = user.id;
    save();
    return { ok: true };
  }

  if (endpoint === "auth/demo" || endpoint === "auth/register" || endpoint === "auth/login") {
    const demo = endpoint === "auth/demo";
    const type = data.type === "dealer" ? "dealer" : "private";
    const supplied = demo ? demoCredentials(type) : data;
    const email = String(supplied.email ?? "").trim().toLowerCase();
    const password = String(supplied.password ?? "");
    let user = state.accounts.find(item => item.email === email);

    if (endpoint === "auth/register" || (demo && !user)) {
      if (user) throw Object.assign(new Error("Račun s tom e-poštom već postoji."), { fields: { email: "Račun s tom e-poštom već postoji." } });
      if (!supplied.terms || !supplied.declaration || password.length < 8 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Provjerite podatke za registraciju (lozinka najmanje 8 znakova).");
      }
      const profile = makeProfile(supplied, type);
      const salt = crypto.randomUUID();
      const id = crypto.randomUUID();
      const autoActivate = demo || data.skipVerification === true;
      user = {
        id,
        email,
        profile,
        salt,
        password: await derive(password, salt),
        verified: demo || type === "dealer",
        emailVerified: autoActivate,
        moderator: false,
        listings: [],
        favorites: [],
        conversations: seedDemoConversations(id),
        used: {},
      };
      state.accounts.push(user);
      if (!autoActivate) {
        save();
        return { ok: true, needsVerification: true, email };
      }
    } else {
      if (!user || (!demo && (await derive(password, user.salt)) !== user.password)) {
        throw new Error("Pogrešan e-mail ili lozinka.");
      }
      if (user.emailVerified === false && !demo) {
        throw new Error("Potvrdite svoju e-mail adresu prije prijave.");
      }
    }
    if (demo) seedSellerAnalytics(state, user);
    state.active = user.id;
    save();
    return { ok: true };
  }

  if (endpoint === "report") {
    const id = crypto.randomUUID();
    (state.reports ??= []).push(id);
    save();
    return { id };
  }
  if (endpoint.startsWith("report/status?id=")) {
    if (state.reports?.includes(endpoint.split("=")[1])) return { status: "pending" };
    throw new Error("Prijava nije pronađena.");
  }

  if (!account) throw new Error("Prijavite se kako biste nastavili.");
  const listing = account.listings.find(item => item.id === data.id);

  switch (endpoint) {
    case "auth/logout":
      delete state.active;
      break;
    case "otp/start":
      account.otpUntil = Date.now() + 300000;
      save();
      return { demoCode: "123456" };
    case "otp/verify":
      if (!account.otpUntil || account.otpUntil < Date.now() || data.code !== "123456") throw new Error("Kod nije ispravan ili je istekao.");
      account.verified = true;
      delete account.otpUntil;
      break;
    case "profile": {
      if (typeof data.whatsappPhone === "string") {
        const phone = normalizePhone(data.whatsappPhone);
        if (phone && !/^\+385[1-9]\d{6,8}$/.test(phone)) throw new Error("Unesite valjan hrvatski WhatsApp broj.");
        account.profile.whatsappPhone = phone;
      }
      const next = makeProfile({ ...account.profile, ...data }, account.profile.type);
      next.whatsappPhone = account.profile.whatsappPhone;
      next.trialStartedAt = account.profile.trialStartedAt;
      if (next.phone !== account.profile.phone && !account.verified) {
        account.verified = false;
        delete account.otpUntil;
      }
      account.profile = next;
      for (const item of account.listings) {
        Object.assign(item, {
          seller: next.name,
          phone: next.phone,
          sellerAddress: address(next),
          sellerHours: next.hours,
          sellerWorkingHours: next.workingHours,
        });
      }
      break;
    }
    case "favorites/merge": {
      const items = Array.isArray(data.items) ? (data.items as Array<{ id: string; price: number }>) : [];
      for (const entry of items) {
        if (entry?.id && !account.favorites.some(f => f.id === entry.id)) {
          account.favorites.push({ id: String(entry.id), price: Number(entry.price) || 0, priceAlert: true });
        }
      }
      break;
    }
    case "favorite": {
      const id = String(data.id ?? "");
      const existingFav = account.favorites.find(item => item.id === id);
      if (typeof data.priceAlert === "boolean" && data.saved === undefined && existingFav) {
        existingFav.priceAlert = data.priceAlert;
      } else if (data.saved && !existingFav) {
        account.favorites.push({ id, price: Number(data.price) || 0, priceAlert: true });
      } else if (data.saved === false) {
        account.favorites = account.favorites.filter(item => item.id !== id);
      }
      break;
    }
    case "listing/save": {
      const vehicle = data.vehicle as Vehicle;
      const status = data.status as OwnedListing["status"];
      const old = account.listings.find(item => item.id === vehicle.id);
      const nextPreviousPriceEur =
        old && vehicle.price > 0 && old.price > vehicle.price
          ? old.price
          : vehicle.previousPriceEur ?? old?.previousPriceEur;
      const result: OwnedListing = {
        ...vehicle,
        previousPriceEur: nextPreviousPriceEur,
        status,
        seller: account.profile.name,
        phone: account.profile.phone,
        email: account.email,
        verified: account.verified,
        dealer: account.profile.type === "dealer",
        dealershipId: account.profile.type === "dealer" ? account.id : undefined,
        views: old?.views ?? 14,
        reveals: old?.reveals ?? 1,
        listedAt: old?.listedAt ?? new Date().toISOString(),
        boostedUntil: old?.boostedUntil,
        isBoosted: old?.isBoosted,
        boostTier: old?.boostTier,
        boostExpiresAt: old?.boostExpiresAt,
        sellerAddress: address(account.profile),
        sellerHours: account.profile.hours,
        sellerWorkingHours: account.profile.workingHours,
      };
      account.listings = old
        ? account.listings.map(item => (item.id === vehicle.id ? result : item))
        : [result, ...account.listings];
      break;
    }
    case "listing/delete":
      account.listings = account.listings.filter(item => item.id !== data.id);
      state.leads = state.leads?.filter(item => item.sellerId !== account.id || item.listing_id !== data.id);
      break;
    case "listing/boost": {
      if (listing?.status !== "active") throw new Error("Samo aktivni oglasi mogu se istaknuti.");
      const tier = data.tier;
      if (tier !== "boost_72h" && tier !== "top_7d") throw new Error("Odaberite valjanu opciju isticanja.");
      if (hasActiveBoost(listing)) {
        if (listing.boostTier !== tier) throw new Error("Oglas već ima aktivno isticanje.");
        break;
      }
      listing.isBoosted = true;
      listing.boostTier = tier;
      listing.boostExpiresAt = new Date(Date.now() + (tier === "top_7d" ? 7 : 3) * 86400000).toISOString();
      break;
    }
    case "conversation/start": {
      const vehicleId = String(data.vehicleId ?? "");
      const vehicleTitle = String(data.vehicleTitle ?? "Vozilo");
      const vehiclePriceEur = Number(data.vehiclePriceEur) || 0;
      const vehicleImage = data.vehicleImage ? String(data.vehicleImage) : undefined;
      const sellerId = String(data.sellerId || "seller-" + vehicleId);
      const partnerName = String(data.sellerName || "Prodavač oglasa");
      const partnerCity = data.sellerCity ? String(data.sellerCity) : undefined;
      const body = String(data.initialMessage ?? "").trim();

      account.conversations ??= [];
      let conv = account.conversations.find(c => c.vehicleId === vehicleId);
      const nowIso = new Date().toISOString();
      if (!conv) {
        conv = {
          id: crypto.randomUUID(),
          vehicleId,
          vehicleTitle,
          vehiclePriceEur,
          vehicleImage,
          buyerId: account.id,
          sellerId,
          partnerName,
          partnerCity,
          lastMessageAt: nowIso,
          unreadCount: 0,
          messages: [],
        };
        account.conversations.unshift(conv);
      }
      if (body) {
        conv.messages.push({
          id: crypto.randomUUID(),
          conversationId: conv.id,
          senderId: account.id,
          body,
          isRead: true,
          createdAt: nowIso,
        });
        conv.lastMessageAt = nowIso;
      }
      save();
      return { conversationId: conv.id };
    }
    case "message/send": {
      const conversationId = String(data.conversationId ?? "");
      const body = String(data.body ?? "").trim();
      if (!body) throw new Error("Unesite poruku.");
      const conv = (account.conversations ?? []).find(c => c.id === conversationId);
      if (!conv) throw new Error("Razgovor nije pronađen.");
      const nowIso = new Date().toISOString();
      conv.messages.push({
        id: crypto.randomUUID(),
        conversationId: conv.id,
        senderId: account.id,
        body,
        isRead: true,
        createdAt: nowIso,
      });
      conv.lastMessageAt = nowIso;
      break;
    }
    case "conversation/read": {
      const conversationId = String(data.conversationId ?? "");
      const conv = (account.conversations ?? []).find(c => c.id === conversationId);
      if (conv) {
        for (const m of conv.messages) {
          if (m.senderId !== account.id) m.isRead = true;
        }
        conv.unreadCount = 0;
      }
      break;
    }
    case "password":
    case "account/delete":
      if ((await derive(String(endpoint === "password" ? data.current : data.password), account.salt)) !== account.password) {
        throw new Error("Lozinka nije ispravna.");
      }
      if (endpoint === "account/delete") {
        state.accounts = state.accounts.filter(item => item.id !== account.id);
        state.leads = state.leads?.filter(item => item.sellerId !== account.id);
        delete state.active;
      } else {
        if (String(data.password).length < 8) throw new Error("Lozinka mora imati najmanje 8 znakova.");
        account.password = await derive(String(data.password), account.salt);
      }
      break;
    default:
      throw new Error("Usluga nije dostupna u lokalnoj demonstraciji.");
  }
  save();
  return { ok: true };
}

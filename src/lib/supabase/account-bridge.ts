import type { AuthError, RealtimeChannel } from "@supabase/supabase-js";
import type {
  Account,
  ChatMessage,
  Conversation,
  FavoriteEntry,
  ListingStatus,
  OwnedListing,
  Profile,
} from "../../../app/account-api";
import { type Vehicle } from "../../../app/catalog";
import { mapListingRow } from "./listing-row";
import { formatHours, presetHours, validHours, type WorkingHours } from "../../data/working-hours";
import { normalizePhone, profileErrors } from "../../data/profile-validation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";
import { safeAuthNext } from "../auth-next";
import { getAuthCallbackUrl } from "../site-origin";

function slugifySubdomain(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}

export function safeAuthMessage(value: unknown, fallback = "Greška pri prijavi."): string {
  if (value instanceof Error) return typeof value.message === "string" && value.message ? value.message : fallback;
  if (typeof value === "string") return value || fallback;
  const candidate = (value as { message?: unknown } | null)?.message;
  return typeof candidate === "string" && candidate ? candidate : fallback;
}

function listingSaveError(action: string, error: { code?: string; message?: string }): Error {
  const code = error.code ? " (" + error.code + ")" : "";
  return new Error(action + code + " — " + safeAuthMessage(error, "Nepoznata pogreška."));
}

function optionalInteger(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function passwordAuthError(error: AuthError, registration: boolean): Error {
  const message = safeAuthMessage(error, "");
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
    return new Error("Previše pokušaja. Pričekajte nekoliko minuta i pokušajte ponovno.");
  }
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return new Error("Pogrešan e-mail ili lozinka.");
  }
  if (error.code === "user_already_exists" || error.code === "email_exists" || /already registered/i.test(message)) {
    return new Error("Račun s tom e-mail adresom već postoji. Prijavite se ili poništite lozinku.");
  }
  if (error.code === "weak_password") return new Error("Odaberite jaču lozinku.");
  return new Error(registration ? "Registracija nije uspjela." : "Prijava nije uspjela.");
}

function mapProfileRow(row: Record<string, unknown>, email: string): Profile {
  const type = (row.role ?? row.account_type) === "dealer" ? "dealer" : "private";
  const wh = row.working_hours as WorkingHours | undefined;
  const companyName = String(row.dealership_name || row.company_name || "");
  const fullName = row.full_name ? String(row.full_name) : "";
  const name = type === "dealer" ? companyName || fullName : fullName || companyName;
  const tierRaw = String(row.subscription_tier || "starter");
  const subscriptionTier: Profile["subscriptionTier"] =
    tierRaw === "pro" || tierRaw === "ai_partner" ? tierRaw : "starter";
  return {
    type,
    name: name || email.split("@")[0],
    fullName,
    companyName,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    city: String(row.city || "Zagreb"),
    postalCode: typeof row.postal_code === "string" ? row.postal_code : undefined,
    county: String(row.county || "Grad Zagreb"),
    phone: String(row.phone || "+385 "),
    oib: row.oib ? String(row.oib) : undefined,
    address: row.address ? String(row.address) : undefined,
    subdomain: row.subdomain ? String(row.subdomain) : slugifySubdomain(name),
    importUrl: row.xml_feed_url ? String(row.xml_feed_url) : undefined,
    whatsappPhone: row.whatsapp_phone ? String(row.whatsapp_phone) : undefined,
    trialStartedAt: row.trial_started_at ? String(row.trial_started_at) : undefined,
    subscriptionTier,
    aiImpressions: 1420,
    workingHours: wh && validHours(wh) ? wh : undefined,
    hours: wh && validHours(wh) ? formatHours(wh) : undefined,
    alerts: Boolean(row.price_alert_emails ?? true),
    analytics: true,
    emailNotifications: Boolean(row.email_notifications ?? true),
    priceAlertEmails: Boolean(row.price_alert_emails ?? true),
  };
}

export async function supabaseApi(endpoint: string, input: object = {}): Promise<unknown> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return undefined;
  const data = input as Record<string, unknown>;

  if ((typeof endpoint === "string" && endpoint.startsWith("lead/")) || endpoint === "salon/plan") {
    function rpc() {
      switch (endpoint) {
        case "lead/log": return supabase!.rpc("log_listing_lead", {
          listing: data.id, event: data.event, session: data.session,
          device_kind: data.device, source_origin: data.source, name_input: data.name,
          phone_input: data.phone, email_input: data.email, message_input: data.message,
        });
        case "lead/analytics": return supabase!.rpc("seller_analytics");
        case "lead/reply": return supabase!.rpc("respond_to_listing_lead", { lead: data.id, reply: data.reply ?? null });
        case "lead/thread": return supabase!.rpc("buyer_listing_replies", { lead: data.id, session: data.session });
        case "salon/plan": return supabase!.rpc("select_salon_plan", { tier: data.tier });
        default: throw new Error("Usluga nije dostupna.");
      }
    }
    const { data: result, error } = await rpc();
    if (error) throw new Error(safeAuthMessage(error, "Usluga nije dostupna."));
    return result;
  }

  if (endpoint === "inventory") {
    const { data: rows, error } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) return [];
    const listings = rows ?? [];
    const sellers = new Map<string, Record<string, unknown>>();
    if (listings.length) {
      const { data } = await supabase.rpc("public_listing_sellers", { listing_ids: listings.map(row => row.id) });
      for (const seller of data ?? []) sellers.set(String(seller.listing_id), seller);
    }
    return listings.map(row => mapListingRow(row, sellers.get(String(row.id))));
  }

  if (endpoint === "auth/google") {
    const redirectTo = new URL(getAuthCallbackUrl());
    const next = safeAuthNext(typeof window === "undefined" ? undefined : new URLSearchParams(location.search).get("next"));
    if (next) redirectTo.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (error) throw new Error("Google prijava trenutačno nije dostupna.");
    return { ok: true, redirecting: true };
  }

  if (endpoint === "auth/reset") {
    const email = String(data.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Unesite valjanu e-mail adresu.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl(),
    });
    if (error) throw new Error("Slanje poveznice za poništavanje lozinke nije uspjelo.");
    return { ok: true };
  }

  if (endpoint === "auth/login") {
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw passwordAuthError(error, false);
    if (!result?.session) throw new Error("Prijava nije uspjela. Pokušajte ponovno.");
    await supabase.auth.getSession();
    const { error: profileError } = await supabase.rpc("ensure_my_profile");
    if (profileError) console.error("[supabase ensure_my_profile]", safeAuthMessage(profileError));
    return { ok: true };
  }

  if (endpoint === "auth/register") {
    const type = data.type === "dealer" ? "dealer" : "private";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      throw new Error("Unesite valjanu e-mail adresu i lozinku od najmanje 8 znakova.");
    }
    const fullName = String(data.fullName || data.name || "").trim();
    const companyName = type === "dealer" ? String(data.companyName || data.name || "").trim() : "";
    const subdomain = type === "dealer" ? slugifySubdomain(companyName || fullName) : undefined;
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: type,
          full_name: fullName,
          company_name: companyName || undefined,
          phone: normalizePhone(String(data.phone ?? "")),
          city: String(data.city ?? "").trim(),
          postal_code: String(data.postalCode ?? "").trim(),
          county: String(data.county ?? "").trim(),
          oib: type === "dealer" ? String(data.oib ?? "").trim() : undefined,
          address: type === "dealer" ? String(data.address ?? "").trim() : undefined,
          working_hours: type === "dealer" ? presetHours(0) : undefined,
          subdomain,
          email_notifications: true,
          price_alert_emails: data.alerts !== false,
        },
      },
    });
    if (error) throw passwordAuthError(error, true);
    if (!signUpData?.session) throw new Error("Automatska prijava nije uspjela. Pokušajte se prijaviti lozinkom.");
    // Confirm email is disabled: Supabase returns a session immediately.
    await supabase.auth.getSession();
    const { error: profileError } = await supabase.rpc("ensure_my_profile");
    if (profileError) console.error("[supabase ensure_my_profile]", safeAuthMessage(profileError));
    return { ok: true };
  }

  if (endpoint === "auth/logout") {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("Odjava nije uspjela.");
    return { ok: true };
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (endpoint === "account") {
    if (!user) return null;
    const { error: syncError } = await supabase.rpc("ensure_my_profile");
    if (syncError) throw new Error("Učitavanje profila nije uspjelo.");
    const [{ data: profileRow }, { data: listingRows }, { data: favRows }, { data: convRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("favorites").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("*, messages(*)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false }),
    ]);

    const profile = profileRow
      ? mapProfileRow(profileRow as Record<string, unknown>, user.email ?? "")
      : mapProfileRow(
          {
            account_type: "private",
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Korisnik",
            avatar_url: user.user_metadata?.avatar_url,
          },
          user.email ?? "",
        );

    const conversations: Conversation[] = (convRows ?? []).map(c => {
      const row = c as Record<string, unknown>;
      const rawMsgs = Array.isArray(row.messages) ? (row.messages as Record<string, unknown>[]) : [];
      const messages: ChatMessage[] = rawMsgs
        .map(m => ({
          id: String(m.id),
          conversationId: String(m.conversation_id),
          senderId: String(m.sender_id),
          body: String(m.body),
          isRead: Boolean(m.is_read),
          createdAt: String(m.created_at),
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const unreadCount = messages.filter(m => !m.isRead && m.senderId !== user.id).length;
      const isBuyer = String(row.buyer_id) === user.id;
      return {
        id: String(row.id),
        vehicleId: String(row.vehicle_id),
        vehicleTitle: String(row.vehicle_title),
        vehiclePriceEur: Number(row.vehicle_price_eur) || 0,
        vehicleImage: row.vehicle_image ? String(row.vehicle_image) : undefined,
        buyerId: String(row.buyer_id),
        sellerId: String(row.seller_id),
        partnerName: isBuyer ? "Prodavač oglasa" : "Kupac",
        lastMessageAt: String(row.last_message_at),
        unreadCount,
        messages,
      };
    });

    const listings: OwnedListing[] = (listingRows ?? []).map(r => {
      const mapped = mapListingRow(r as Record<string, unknown>, profileRow as Record<string, unknown> | undefined);
      mapped.inquiriesCount = conversations.filter(c => c.vehicleId === mapped.id).length;
      return mapped;
    });

    const favorites: FavoriteEntry[] = (favRows ?? []).map(f => ({
      id: String((f as Record<string, unknown>).vehicle_id),
      price: Number((f as Record<string, unknown>).saved_price_eur) || 0,
      priceAlert: Boolean((f as Record<string, unknown>).price_alert ?? true),
    }));

    const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    const account: Account = {
      id: user.id,
      email: user.email ?? "",
      profile,
      verified: Boolean(profileRow?.is_verified || user.email_confirmed_at),
      listings,
      favorites,
      conversations,
      unreadCount,
      moderator: false,
    };
    return account;
  }

  if (!user) throw new Error("Prijavite se kako biste nastavili.");

  if (endpoint === "favorites/merge") {
    const items = Array.isArray(data.items) ? (data.items as Array<{ id: string; price: number }>) : [];
    for (const item of items) {
      if (!item?.id) continue;
      const { error } = await supabase
        .from("favorites")
        .upsert(
          { user_id: user.id, vehicle_id: item.id, saved_price_eur: Math.round(item.price || 0), price_alert: true },
          { onConflict: "user_id,vehicle_id", ignoreDuplicates: true },
        );
      if (error) throw new Error("Spremanje favorita nije uspjelo.");
    }
    return { ok: true };
  }

  if (endpoint === "favorite") {
    const vehicleId = String(data.id ?? "");
    if (data.saved === false) {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("vehicle_id", vehicleId);
      if (error) throw new Error("Uklanjanje favorita nije uspjelo.");
    } else if (typeof data.priceAlert === "boolean" && data.saved === undefined) {
      const { error } = await supabase.from("favorites").update({ price_alert: data.priceAlert }).eq("user_id", user.id).eq("vehicle_id", vehicleId);
      if (error) throw new Error("Spremanje postavki favorita nije uspjelo.");
    } else {
      const { error } = await supabase
        .from("favorites")
        .upsert(
          { user_id: user.id, vehicle_id: vehicleId, saved_price_eur: Math.round(Number(data.price) || 0), price_alert: true },
          { onConflict: "user_id,vehicle_id" },
        );
      if (error) throw new Error("Spremanje favorita nije uspjelo.");
    }
    return { ok: true };
  }

  if (endpoint === "profile") {
    const type = data.type === "dealer" ? "dealer" : undefined;
    if (data.name !== undefined || data.city !== undefined) {
      const errors = profileErrors(data, type === "dealer");
      if (!data.postalCode) delete errors.postalCode;
      if (Object.keys(errors).length) throw Object.assign(new Error("Provjerite označena polja."), { fields: errors });
    }
    const patch: Record<string, unknown> = {};
    if (typeof data.name === "string") {
      patch.full_name = data.name.trim();
      if (type === "dealer") {
        patch.dealership_name = patch.company_name = data.name.trim();
        patch.subdomain = slugifySubdomain(data.name.trim());
      }
    }
    if (typeof data.fullName === "string") patch.full_name = data.fullName.trim();
    if (typeof data.companyName === "string") {
      patch.dealership_name = patch.company_name = data.companyName.trim();
      patch.subdomain = slugifySubdomain(data.companyName.trim());
    }
    if (typeof data.phone === "string") patch.phone = normalizePhone(data.phone);
    if (typeof data.city === "string") patch.city = data.city.trim();
    if (typeof data.postalCode === "string") patch.postal_code = data.postalCode.trim() || null;
    if (typeof data.county === "string") patch.county = data.county.trim();
    if (typeof data.oib === "string") patch.oib = data.oib.trim();
    if (typeof data.address === "string") patch.address = data.address.trim();
    if (typeof data.importUrl === "string") patch.xml_feed_url = data.importUrl.trim();
    if (typeof data.whatsappPhone === "string") {
      const phone = normalizePhone(data.whatsappPhone);
      if (phone && !/^\+385[1-9]\d{6,8}$/.test(phone)) throw new Error("Unesite valjan hrvatski WhatsApp broj.");
      patch.whatsapp_phone = phone;
    }
    if (data.workingHours) {
      const wh = typeof data.workingHours === "string" ? JSON.parse(data.workingHours) : data.workingHours;
      if (validHours(wh)) patch.working_hours = wh;
    }
    if (typeof data.emailNotifications === "boolean") patch.email_notifications = data.emailNotifications;
    if (typeof data.priceAlertEmails === "boolean" || typeof data.alerts === "boolean") {
      patch.price_alert_emails = Boolean(data.priceAlertEmails ?? data.alerts);
    }

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) throw new Error("Spremanje profila nije uspjelo.");
    return { ok: true };
  }

  if (endpoint === "password") {
    const newPassword = String(data.password ?? "");
    if (newPassword.length < 8) throw new Error("Nova lozinka mora imati najmanje 8 znakova.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error("Promjena lozinke nije uspjela.");
    return { ok: true };
  }

  if (endpoint === "listing/save") {
    const vehicle = data.vehicle as Vehicle;
    const status = String(data.status ?? "active") as ListingStatus;
    const [yearStr, monthStr] = (vehicle.date || "").split("-");
    const registration = vehicle.registrationUntil?.trim() || null;
    const isoRegistration = registration?.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
    const equipArr: Array<string | { label: string; category: string }> = [
      ...(vehicle.catalogEquipment ?? []),
      ...Object.entries(vehicle.equipment ?? {}).flatMap(([category, items]) =>
        items.map(label => ({ label, category })),
      ),
    ].slice(0, 80);

    const { error: profileError } = await supabase.rpc("ensure_my_profile");
    if (profileError) throw listingSaveError("Priprema profila nije uspjela", profileError);

    const { data: existingRow, error: readError } = await supabase
      .from("listings")
      .select("price_eur, previous_price_eur")
      .eq("id", vehicle.id)
      .maybeSingle();

    if (readError) throw listingSaveError("Učitavanje oglasa nije uspjelo", readError);

    const oldPrice = existingRow?.price_eur ? Number(existingRow.price_eur) : 0;
    const newPrice = Math.round(vehicle.price || 0);
    const previousPriceEur =
      oldPrice > 0 && newPrice > 0 && oldPrice > newPrice
        ? oldPrice
        : optionalInteger(vehicle.previousPriceEur) ?? optionalInteger(existingRow?.previous_price_eur);

    const bucket = supabase.storage.from("vehicle-images");
    const photoSources = vehicle.photos.flatMap(photo => typeof photo?.src === "string" ? [photo.src] : []);
    const images = await Promise.all(photoSources.map(async src => {
      if (typeof src !== "string" || !src.startsWith("data:image/webp;base64,")) return src;
      const image = await (await fetch(src)).blob();
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", await image.arrayBuffer()));
      const hash = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      const filename = user.id + "/manual/" + hash + ".webp";
      const { error } = await bucket.upload(filename, image, { contentType: "image/webp", upsert: true });
      if (error) throw listingSaveError("Spremanje fotografije nije uspjelo", error);
      return bucket.getPublicUrl(filename).data.publicUrl;
    }));
    const payload = {
      id: vehicle.id,
      user_id: user.id,
      owner_id: user.id,
      status,
      make: vehicle.make,
      model: vehicle.model,
      generation: vehicle.generation ?? null,
      trim: vehicle.trim || null,
      variant: vehicle.variant ?? "",
      show_price_badge: vehicle.showPriceBadge === true,
      value_proofs: vehicle.valueProofs ?? null,
      make_equipment: vehicle.makeEquipment ?? null,
      title: vehicle.title,
      body_style: vehicle.bodyType ?? null,
      year: Number(yearStr) || 2022,
      month: optionalInteger(monthStr),
      mileage: Math.round(vehicle.km || 0),
      fuel: vehicle.fuel,
      transmission: vehicle.gear,
      drivetrain: vehicle.drive,
      power_kw: Math.round(vehicle.kw || 0),
      engine_cc: optionalInteger(vehicle.cc),
      co2: optionalInteger(vehicle.co2),
      cylinders: optionalInteger(vehicle.cylinders),
      doors: optionalInteger(vehicle.doors),
      seats: optionalInteger(vehicle.seats),
      ownership: vehicle.ownership?.trim() || null,
      registration_until: isoRegistration ? isoRegistration[2] + "/" + isoRegistration[1] : registration,
      color: vehicle.color ?? null,
      vin: vehicle.vin || null,
      previous_price_eur: previousPriceEur,
      price_eur: newPrice,
      vat_deductible: vehicle.flags?.includes("pdv") ?? false,
      on_buyer_name: vehicle.flags?.includes("kupac") ?? false,
      cvh_verified: vehicle.flags?.includes("cvh") ?? false,
      first_owner: vehicle.history?.some(h => /1\.\s*vlasnik/i.test(h)) ?? false,
      service_book: vehicle.history?.some(h => /servisn/i.test(h)) ?? false,
      in_transit: vehicle.flags?.includes("dolazak") ?? false,
      warranty_12m: vehicle.flags?.includes("jamstvo") ?? false,
      city: vehicle.city,
      county: vehicle.county ?? null,
      description: vehicle.sellerNote ?? null,
      equipment: equipArr,
      images,
    };

    const { error } = await supabase.from("listings").upsert(payload, { onConflict: "id" });
    if (error) throw listingSaveError("Spremanje oglasa nije uspjelo", error);
    return { ok: true };
  }

  if (endpoint === "listing/boost") {
    const { error } = await supabase.rpc("activate_listing_boost", { listing_id: data.id, tier: data.tier });
    if (error) {
      if (error.code === "PGRST202") throw new Error("Isticanje oglasa trenutačno nije dostupno.");
      throw new Error(safeAuthMessage(error, "Isticanje oglasa nije uspjelo."));
    }
    return { ok: true };
  }

  if (endpoint === "listing/delete") {
    const { error } = await supabase.from("listings").delete().eq("id", String(data.id)).eq("user_id", user.id);
    if (error) throw new Error("Brisanje oglasa nije uspjelo.");
    return { ok: true };
  }

  if (endpoint === "conversation/start") {
    const vehicleId = String(data.vehicleId ?? "");
    if (!/^[a-f0-9-]{36}$/i.test(vehicleId)) throw new Error("Razgovor za ovaj oglas nije dostupan.");
    const { data: conversationId, error } = await supabase.rpc("open_listing_conversation", {
      listing: vehicleId,
      message_body: String(data.initialMessage ?? "").trim() || null,
    });
    if (error || !conversationId) throw new Error("Pokretanje razgovora nije uspjelo.");
    return { conversationId };
  }

  if (endpoint === "message/send") {
    const conversationId = String(data.conversationId ?? "");
    const body = String(data.body ?? "").trim();
    if (!conversationId || !body) throw new Error("Unesite tekst poruke.");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    });
    if (error) throw new Error("Slanje poruke nije uspjelo.");
    return { ok: true };
  }

  if (endpoint === "conversation/read") {
    const conversationId = String(data.conversationId ?? "");
    if (!conversationId) return { ok: true };
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    return { ok: true };
  }

  return undefined;
}

export function subscribeSupabaseMessages(userId: string, onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`autoplac-inbox-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "listing_leads", filter: `seller_id=eq.${userId}` }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

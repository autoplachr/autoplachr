export type AdPlacement =
  | "hero-leaderboard"
  | "sidebar-square"
  | "in-feed-native"
  | "detail-vin-card";

export type NativeAdCampaign = {
  placement: AdPlacement;
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
  actionType?: "external" | "financing" | "dealer-b2b";
};

const CARVERTICAL_URL =
  process.env.NEXT_PUBLIC_CARVERTICAL_AFFILIATE_URL?.trim() ||
  "https://www.carvertical.com/hr";

export const NATIVE_AD_CAMPAIGNS: Record<AdPlacement, NativeAdCampaign> = {
  "hero-leaderboard": {
    placement: "hero-leaderboard",
    badge: "Sponzorirano",
    eyebrow: "carVertical × AUTOPLAC.HR",
    title: "Provjera broja šasije (VIN) s 20% popusta za kupce na AUTOPLAC.HR",
    description:
      "Provjerite stvarne kilometre, zapise o štetama, krađama i tvorničku opremu iz 900+ baza podataka prije kupnje vozila.",
    ctaLabel: "Provjeri VIN uz 20% popusta",
    href: CARVERTICAL_URL,
    external: true,
    actionType: "external",
  },
  "sidebar-square": {
    placement: "sidebar-square",
    badge: "Oglas",
    eyebrow: "Financiranje i B2B",
    title: "Leasing i auto-kredit — Odobrenje u 24h",
    description:
      "Usporedite mjesečne rate s 10–30% učešća za rabljena vozila do 10 godina starosti ili aktivirajte B2B paket za autokuće (0 € prvih 90 dana).",
    ctaLabel: "Izračunaj ratu",
    href: "/registracija",
    external: false,
    actionType: "financing",
  },
  "in-feed-native": {
    placement: "in-feed-native",
    badge: "Sponzorirano",
    eyebrow: "Auto osiguranje RH",
    title: "Kasko i obvezno osiguranje — Usporedi cijene svih osiguravatelja u RH u 60 sekundi",
    description:
      "Uštedite do 25% na godišnjoj polici AO i punom kasku uz trenutni izračun bonusa i zaštitu od tuče.",
    ctaLabel: "Usporedi police",
    href: "/ppmv-kalkulator",
    external: false,
    actionType: "financing",
  },
  "detail-vin-card": {
    placement: "detail-vin-card",
    badge: "Sponzorirano",
    eyebrow: "Povijest i zaštita kupca",
    title: "Provjeri povijest, štetu i stvarne kilometre po broju šasije",
    description:
      "Prije pregleda vozila provjerite izvješće o kilometraži, prethodnim nezgodama i tehničkim pregledima u EU.",
    ctaLabel: "Pokreni VIN provjeru (-20%)",
    href: CARVERTICAL_URL,
    external: true,
    actionType: "external",
  },
};

import { CAR_MAKES, modelFor, modelsFor } from "../data/car-catalog";
import { buildMockVehicles } from "../data/mock-vehicles";
import importedListings from "../../data/imported-listings.json";
import type { Photo, Vehicle } from "../../app/catalog";
import photoData from "../../app/photos.json";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://autoplac.hr").replace(/\/$/, "");
export const SITE_NAME = "AUTOPLAC.HR";

export function slugifyHr(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type SeoBrand = {
  name: string;
  slug: string;
};

export type SeoCity = {
  city: string;
  slug: string;
  county: string;
};

export const SEO_BRANDS: readonly SeoBrand[] = CAR_MAKES.map(name => ({
  name,
  slug: slugifyHr(name),
}));

export const SEO_CITIES: readonly SeoCity[] = [
  { city: "Zagreb", slug: "zagreb", county: "Grad Zagreb" },
  { city: "Split", slug: "split", county: "Splitsko-dalmatinska" },
  { city: "Rijeka", slug: "rijeka", county: "Primorsko-goranska" },
  { city: "Osijek", slug: "osijek", county: "Osječko-baranjska" },
  { city: "Zadar", slug: "zadar", county: "Zadarska" },
  { city: "Pula", slug: "pula", county: "Istarska" },
  { city: "Slavonski Brod", slug: "slavonski-brod", county: "Brodsko-posavska" },
  { city: "Varaždin", slug: "varazdin", county: "Varaždinska" },
  { city: "Šibenik", slug: "sibenik", county: "Šibensko-kninska" },
  { city: "Dubrovnik", slug: "dubrovnik", county: "Dubrovačko-neretvanska" },
  { city: "Karlovac", slug: "karlovac", county: "Karlovačka" },
  { city: "Sisak", slug: "sisak", county: "Sisačko-moslavačka" },
  { city: "Vinkovci", slug: "vinkovci", county: "Vukovarsko-srijemska" },
  { city: "Čakovec", slug: "cakovec", county: "Međimurska" },
  { city: "Koprivnica", slug: "koprivnica", county: "Koprivničko-križevačka" },
  { city: "Bjelovar", slug: "bjelovar", county: "Bjelovarsko-bilogorska" },
];

export const TOP_FOOTER_BRANDS = [
  "BMW",
  "Volkswagen",
  "Audi",
  "Mercedes-Benz",
  "Škoda",
  "Porsche",
  "Toyota",
  "Renault",
  "Peugeot",
  "Hyundai",
  "Tesla",
  "Volvo",
] as const;

export function findBrandBySlug(slug: string): SeoBrand | undefined {
  return SEO_BRANDS.find(b => b.slug === slug);
}

export function findCityBySlug(slug: string): SeoCity | undefined {
  return SEO_CITIES.find(c => c.slug === slug);
}

export function staticCatalogVehicles(): Vehicle[] {
  const photos = photoData as Record<string, Photo[]>;
  return [...buildMockVehicles(key => photos[key] ?? []), ...(importedListings as Vehicle[])];
}

/** Stable, descriptive per-vehicle slug: title + godište + grad + id (e.g. bmw-320d-g20-m-sport-xdrive-2021-zagreb-g20). */
export function vehicleSeoSlug(vehicle: Vehicle): string {
  const year = vehicle.date.slice(0, 4);
  return `${slugifyHr(`${vehicle.title} ${year} ${vehicle.city}`)}-${slugifyHr(vehicle.id)}`;
}

export const VEHICLE_SEO_SLUGS: ReadonlyMap<string, string> = new Map(
  staticCatalogVehicles().map(vehicle => [vehicle.id, vehicleSeoSlug(vehicle)]),
);

export function vehicleSeoPath(vehicle: Vehicle): string {
  return `/oglas/${vehicleSeoSlug(vehicle)}`;
}

/** Descriptive static URL for known catalog vehicles, `?oglas=` fallback for user-created listings. */
export function vehicleListingPath(id: string): string {
  const slug = VEHICLE_SEO_SLUGS.get(id);
  return slug ? `/oglas/${slug}` : `/?oglas=${encodeURIComponent(id)}`;
}

export function findVehicleBySeoSlug(slug: string): Vehicle | undefined {
  return staticCatalogVehicles().find(vehicle => vehicleSeoSlug(vehicle) === slug);
}

/** Resolve an `/oglas/<slug>` pathname back to its vehicle id (SPA + ?oglas= fallback). */
export function vehicleIdFromPath(pathname: string): string | null {
  const match = /^\/oglas\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let slug = match[1];
  try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
  for (const [id, candidate] of VEHICLE_SEO_SLUGS) {
    if (candidate === slug) return id;
  }
  return null;
}

export function absoluteImageUrl(src?: string): string {
  if (!src) return `${SITE_URL}/hero-twilight.webp`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith("/") ? src : "/" + src}`;
}

export function popularModelsForBrand(brand: string): string[] {
  return modelsFor(brand, false)
    .filter(m => {
      const fam = modelFor(brand, m);
      return Boolean(fam);
    })
    .slice(0, 6);
}

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export const SEO_FAQS: readonly SeoFaqItem[] = [
  {
    question: "Kako se računa PPMV pri uvozu rabljenog auta iz Njemačke u Hrvatsku?",
    answer:
      "Posebni porez na motorna vozila (PPMV) sastoji se od vrijednosne komponente prema hrvatskoj cijeni novog vozila (umanjenoj za tablicu starosti) i ekološke komponente prema CO₂ emisiji u g/km (WLTP ili NEDC) i vrsti goriva. Električna vozila s 0 g/km CO₂ oslobođena su plaćanja PPMV-a.",
  },
  {
    question: "Koliko košta objava oglasa na AUTOPLAC.HR?",
    answer:
      "Privatni prodavači mogu besplatno objaviti do 2 aktivna oglasa u kalendarskoj godini (0 €). Provjerene autokuće i trgovci mogu upravljati neograničenim zalihama vozila i koristiti javnu poddomenu salona.",
  },
  {
    question: "Kako provjeriti stvarne kilometre vozila u RH?",
    answer:
      "Stanje brojila kilometara za vozila registrirana u Hrvatskoj može se potvrditi putem službene potvrde Centra za vozila Hrvatske (CVH) na stanici za tehnički pregled, kao i dodatnom provjerom povijesti po broju šasije (VIN) za uvozna vozila.",
  },
  {
    question: "Kako AUTOPLAC.HR procjenjuje je li cijena vozila odlična ili fer?",
    answer:
      "Naš parametarski algoritam analizira mjesečnu starost vozila, generaciju šasije, snagu motora (kW), vrstu goriva, odstupanje kilometraže od hrvatskog prosjeka, ugrađenu tvorničku opremu, status PDV-a/CVH-a i regionalnu potražnju u RH.",
  },
  {
    question: "Što znači oznaka Na ime kupca u odnosu na Sustav PDV-a (R1)?",
    answer:
      "Oznaka 'Na ime kupca' znači da je prodavač već podmirio davanja ili se prijenos obavlja bez plaćanja upravne pristojbe na prijenos vlasništva. 'Sustav PDV-a (R1)' znači da je vozilo u sustavu PDV-a te pravne osobe i obrtnici mogu ostvariti odbitak pretporeza.",
  },
];

import type { WorkingHours } from "./working-hours";

/** Local slug helper (keeps this data module free of a circular import with lib/seo). */
function slugifyHr(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type DealershipDirectoryEntry = {
  slug: string;
  name: string;
  city: string;
  county: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  workingHours: WorkingHours;
  score: number;
  reviews: number;
  badges: readonly string[];
  bannerImage: string;
  description: string;
  foundedYear: number;
};

const STANDARD_WEEKDAYS: WorkingHours = {
  days: [
    { open: true, from: "08:00", to: "18:00" },
    { open: true, from: "09:00", to: "13:00" },
    { open: false, from: "09:00", to: "13:00" },
  ],
  afterHours: true,
  appointmentOnly: false,
};

const SHORT_WEEKDAYS: WorkingHours = {
  days: [
    { open: true, from: "08:00", to: "17:00" },
    { open: true, from: "09:00", to: "12:30" },
    { open: false, from: "09:00", to: "12:30" },
  ],
  afterHours: true,
  appointmentOnly: false,
};

export const DEALERSHIP_DIRECTORY: readonly DealershipDirectoryEntry[] = [
  {
    slug: slugifyHr("Auto Centar Horvat"),
    name: "Auto Centar Horvat",
    city: "Zagreb",
    county: "Grad Zagreb",
    address: "Slavonska avenija 52, 10000 Zagreb",
    phone: "+385 1 6400 210",
    email: "prodaja@ac-horvat.hr",
    hours: "Pon–Pet 08:00 – 18:00, Sub 09:00 – 13:00",
    workingHours: STANDARD_WEEKDAYS,
    score: 4.8,
    reviews: 64,
    badges: ["Sustav PDV-a R1", "Uvoz po narudžbi", "Jamstvo 12 mj."],
    bannerImage: "/cars/commons/bmw-g20-1.webp",
    description:
      "Specijalizirani zagrebački salon za provjerena premium i poslovna vozila s potpunom CVH poviješću, R1 računom i mogućnošću financiranja putem leasinga u 24 sata.",
    foundedYear: 2012,
  },
  {
    slug: slugifyHr("Dalmacija Auto Centar"),
    name: "Dalmacija Auto Centar",
    city: "Split",
    county: "Splitsko-dalmatinska",
    address: "Ulica Domovinskog rata 96, 21000 Split",
    phone: "+385 21 540 880",
    email: "info@dalmacija-auto.hr",
    hours: "Pon–Pet 08:00 – 18:00, Sub 09:00 – 13:00",
    workingHours: STANDARD_WEEKDAYS,
    score: 4.9,
    reviews: 78,
    badges: ["Sustav PDV-a R1", "Jamstvo 12 mj.", "Zamjena staro za novo"],
    bannerImage: "/cars/commons/mercedes-c-class-1.webp",
    description:
      "Vodeća autokuća u Dalmaciji za novija rabljena vozila iz EU i RH. Svako vozilo prolazi inspekciju u 110 točaka te dolazi s pismenim jamstvom na kilometre i motor.",
    foundedYear: 2010,
  },
  {
    slug: slugifyHr("Kvarner Automobili"),
    name: "Kvarner Automobili",
    city: "Rijeka",
    county: "Primorsko-goranska",
    address: "Osječka ulica 39, 51000 Rijeka",
    phone: "+385 51 422 390",
    email: "salon@kvarner-automobili.hr",
    hours: "Pon–Pet 08:30 – 18:00, Sub 09:00 – 13:00",
    workingHours: STANDARD_WEEKDAYS,
    score: 4.7,
    reviews: 42,
    badges: ["Sustav PDV-a R1", "Uvoz po narudžbi", "CVH potvrda km"],
    bannerImage: "/cars/commons/audi-a4-1.webp",
    description:
      "Riječki centar rabljenih vozila s fokusom na njemačke i skandinavske marke. Organiziramo pregled u ovlaštenom servisu i kompletnu registraciju na ime kupca.",
    foundedYear: 2015,
  },
  {
    slug: slugifyHr("Auto Kuća Kovačević"),
    name: "Auto Kuća Kovačević",
    city: "Osijek",
    county: "Osječko-baranjska",
    address: "J. J. Strossmayera 188, 31000 Osijek",
    phone: "+385 31 375 120",
    email: "prodaja@ak-kovacevic.hr",
    hours: "Pon–Pet 08:00 – 17:30, Sub 09:00 – 13:00",
    workingHours: SHORT_WEEKDAYS,
    score: 4.8,
    reviews: 51,
    badges: ["Jamstvo 12 mj.", "Na ime kupca", "CVH potvrda km"],
    bannerImage: "/cars/commons/golf-3-wide.webp",
    description:
      "Slavonski obiteljski salon s više od desetljeća tradicije u prodaji i individualnom uvozu vozila iz Njemačke i Austrije bez skrivenih troškova.",
    foundedYear: 2011,
  },
  {
    slug: slugifyHr("Auto Salon Vindiš"),
    name: "Auto Salon Vindiš",
    city: "Varaždin",
    county: "Varaždinska",
    address: "Gospodarska ulica 14, 42000 Varaždin",
    phone: "+385 42 290 450",
    email: "kontakt@autosalon-vindis.hr",
    hours: "Pon–Pet 08:00 – 17:00, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.7,
    reviews: 36,
    badges: ["Sustav PDV-a R1", "Uvoz po narudžbi", "Jamstvo 12 mj."],
    bannerImage: "/cars/commons/skoda-octavia-1.webp",
    description:
      "Varaždinski centar za obiteljska, karavan i SUV vozila VW grupacije te azijskih marki s transparentnom servisnom poviješću i brzim leasing odobrenjem.",
    foundedYear: 2016,
  },
  {
    slug: slugifyHr("Istra Mobil"),
    name: "Istra Mobil",
    city: "Pula",
    county: "Istarska",
    address: "Šijanska cesta 12, 52100 Pula",
    phone: "+385 52 504 710",
    email: "prodaja@istra-mobil.hr",
    hours: "Pon–Pet 08:30 – 17:30, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.6,
    reviews: 29,
    badges: ["Jamstvo 12 mj.", "Na ime kupca", "Zamjena staro za novo"],
    bannerImage: "/cars/commons/peugeot-3008-2.jpg",
    description:
      "Istarski salon provjerenih gradskih i SUV vozila s urednim domaćim i EU porijeklom, tehničkim pregledom i mogućnošću dostave vozila po cijeloj Hrvatskoj.",
    foundedYear: 2017,
  },
  {
    slug: slugifyHr("Auto Kuća Brod"),
    name: "Auto Kuća Brod",
    city: "Slavonski Brod",
    county: "Brodsko-posavska",
    address: "Osječka ulica 142, 35000 Slavonski Brod",
    phone: "+385 35 411 630",
    email: "info@ak-brod.hr",
    hours: "Pon–Pet 08:00 – 17:00, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.8,
    reviews: 33,
    badges: ["Sustav PDV-a R1", "Uvoz po narudžbi", "CVH potvrda km"],
    bannerImage: "/cars/commons/volkswagen-passat-1.webp",
    description:
      "Provjerena slavonska autokuća specijalizirana za dizelske limuzine i poslovne karavane s potvrđenom kilometražom i plaćenim svim davanjima do registracije.",
    foundedYear: 2014,
  },
  {
    slug: slugifyHr("Auto Centar Posavina"),
    name: "Auto Centar Posavina",
    city: "Sisak",
    county: "Sisačko-moslavačka",
    address: "Zagrebačka ulica 44, 44000 Sisak",
    phone: "+385 44 520 310",
    email: "prodaja@ac-posavina.hr",
    hours: "Pon–Pet 08:00 – 17:00, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.7,
    reviews: 23,
    badges: ["Jamstvo 12 mj.", "Na ime kupca"],
    bannerImage: "/cars/commons/ford-kuga-1.jpg",
    description:
      "Pouzdana ponuda SUV i plug-in hibridnih vozila s kompletnom dokumentacijom, servisnom evidencijom i podrškom pri ugovaranju osiguranja.",
    foundedYear: 2018,
  },
  {
    slug: slugifyHr("Šibenik Automobili"),
    name: "Šibenik Automobili",
    city: "Šibenik",
    county: "Šibensko-kninska",
    address: "Ulica Velimira Škorpika 11, 22000 Šibenik",
    phone: "+385 22 338 900",
    email: "kontakt@sibenik-auto.hr",
    hours: "Pon–Pet 08:30 – 17:30, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.8,
    reviews: 31,
    badges: ["Sustav PDV-a R1", "Jamstvo 12 mj."],
    bannerImage: "/cars/commons/alfa-stelvio-1.jpg",
    description:
      "Odabrana ponuda sportskih i obiteljskih SUV vozila uz transparentnu procjenu tržišne vrijednosti i individualno savjetovanje pri kupnji.",
    foundedYear: 2016,
  },
  {
    slug: slugifyHr("Auto Kuća Novak"),
    name: "Auto Kuća Novak",
    city: "Čakovec",
    county: "Međimurska",
    address: "Zagrebačka cesta 87, 40000 Čakovec",
    phone: "+385 40 364 510",
    email: "prodaja@ak-novak.hr",
    hours: "Pon–Pet 08:00 – 17:00, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.8,
    reviews: 38,
    badges: ["Sustav PDV-a R1", "Uvoz po narudžbi", "Jamstvo 12 mj."],
    bannerImage: "/cars/commons/cupra-1-wide.webp",
    description:
      "Međimurska autokuća s naglaskom na atraktivne sport-utility i crossover modele novijeg godišta s tvorničkim jamstvom.",
    foundedYear: 2013,
  },
  {
    slug: slugifyHr("Auto Centar Vinkovci"),
    name: "Auto Centar Vinkovci",
    city: "Vinkovci",
    county: "Vukovarsko-srijemska",
    address: "Vukovarska ulica 102, 32100 Vinkovci",
    phone: "+385 32 308 140",
    email: "info@ac-vinkovci.hr",
    hours: "Pon–Pet 08:00 – 17:00, Sub 09:00 – 12:30",
    workingHours: SHORT_WEEKDAYS,
    score: 4.6,
    reviews: 25,
    badges: ["Na ime kupca", "CVH potvrda km"],
    bannerImage: "/cars/commons/duster-1-wide.webp",
    description:
      "Pristupačna i provjerena vozila za svakodnevnu vožnju i obitelj, spremna za registraciju odmah po preuzimanju.",
    foundedYear: 2019,
  },
];

export const DEALERSHIP_BY_NAME: Record<string, DealershipDirectoryEntry> = Object.fromEntries(
  DEALERSHIP_DIRECTORY.map(d => [d.name, d]),
);

export function findDealershipBySlug(slug: string): DealershipDirectoryEntry | undefined {
  return DEALERSHIP_DIRECTORY.find(d => d.slug === slug);
}

export const DIRECTORY_CITIES = [
  "Svi gradovi",
  "Zagreb",
  "Split",
  "Rijeka",
  "Osijek",
  "Varaždin",
  "Pula",
  "Slavonski Brod",
] as const;

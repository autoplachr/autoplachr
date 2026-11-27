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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/bmw-g20-1.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/mercedes-c-class-1.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/audi-a4-1.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/golf-3-wide.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/skoda-octavia-1.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/peugeot-3008-2.jpg",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/volkswagen-passat-1.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/ford-kuga-1.jpg",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/alfa-stelvio-1.jpg",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/cupra-1-wide.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
    badges: ["Ogledni podaci"],
    bannerImage: "/cars/commons/duster-1-wide.webp",
    description: "Ogledni salon rabljenih vozila. Navedeni podaci služe za prikaz imenika.",
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
  ...Array.from(new Set(DEALERSHIP_DIRECTORY.map(d => d.city))),
] as const;

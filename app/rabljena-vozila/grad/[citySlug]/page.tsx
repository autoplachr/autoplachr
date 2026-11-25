import type { Metadata } from "next";
import Link from "next/link";
import Marketplace from "../../../marketplace";
import { euro } from "../../../catalog";
import { JsonLd } from "../../../../src/components/JsonLd";
import {
  findCityBySlug,
  SEO_CITIES,
  SITE_NAME,
  SITE_URL,
  staticCatalogVehicles,
  TOP_FOOTER_BRANDS,
  slugifyHr,
  vehicleSeoPath,
} from "../../../../src/lib/seo";

type Props = { params: Promise<{ citySlug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return SEO_CITIES.map(c => ({ citySlug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citySlug } = await params;
  const city = findCityBySlug(citySlug);
  if (!city) return { title: "Rabljena vozila po gradovima" };

  const title = `Rabljena vozila ${city.city} (${city.county}) — Oglasi i tržišne cijene`;
  const description = `Pronađite provjerena rabljena vozila u gradu ${city.city} i županiji ${city.county}. Usporedite cijene, autokuće i kilometre na AUTOPLAC.HR.`;
  return {
    title,
    description,
    alternates: { canonical: `/rabljena-vozila/grad/${city.slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/rabljena-vozila/grad/${city.slug}`,
      locale: "hr_HR",
      type: "website",
    },
  };
}

export default async function CitySeoPage({ params }: Props) {
  const { citySlug } = await params;
  const cityInfo = findCityBySlug(citySlug);
  const cityName = cityInfo?.city ?? citySlug;
  const countyName = cityInfo?.county ?? "";
  const all = staticCatalogVehicles();
  const matching = all.filter(v => v.city === cityName || (countyName && v.county === countyName));
  const avgPrice = matching.length
    ? Math.round(matching.reduce((s, v) => s + v.price, 0) / matching.length)
    : 0;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: `Rabljena vozila ${cityName}`,
          item: `${SITE_URL}/rabljena-vozila/grad/${citySlug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Rabljena vozila ${cityName}`,
      numberOfItems: matching.length,
      itemListElement: matching.map((v, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}${vehicleSeoPath(v)}`,
        name: v.title,
      })),
    },
  ];

  const seoBanner = (
    <section className="shell pt-6 pb-2" aria-label={`Ponuda vozila ${cityName}`}>
      <div className="detail-panel rounded-xl flex flex-col gap-3">
        <nav className="text-[12.5px] text-[var(--muted)] flex flex-wrap items-center gap-1.5" aria-label="Putanja">
          <Link href="/" className="hover:underline">Početna</Link>
          <span>/</span>
          <span>Rabljena vozila</span>
          <span>/</span>
          <strong className="text-[var(--text)] !m-0">{cityName}</strong>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="!m-0 text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[var(--text)]">
              Rabljena vozila {cityName} — Provjerene cijene i ponuda
            </h1>
            <p className="text-[13.5px] text-[var(--muted)] mt-1 !m-0">
              {matching.length} aktivnih oglasa za područje {cityName} ({countyName})
              {avgPrice > 0 ? ` · Prosječna cijena: ${euro(avgPrice)}.` : "."}
            </p>
          </div>
          <Link href="/procjena-cijene" className="btn secondary text-[13px]">
            Procjena cijene vozila →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] text-[12px]">
          <span className="font-semibold text-[var(--muted)]">Popularne marke:</span>
          {TOP_FOOTER_BRANDS.slice(0, 6).map(brand => (
            <Link
              key={brand}
              href={`/rabljena-vozila/${slugifyHr(brand)}`}
              className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--hover)] text-[var(--spec)] hover:border-[#2563EB]"
            >
              {brand}
            </Link>
          ))}
          <span className="font-semibold text-[var(--muted)] ml-1">Susjedni gradovi:</span>
          {SEO_CITIES.filter(c => c.slug !== citySlug).slice(0, 5).map(c => (
            <Link
              key={c.slug}
              href={`/rabljena-vozila/grad/${c.slug}`}
              className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--hover)] text-[var(--spec)] hover:border-[#2563EB]"
            >
              {c.city}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <Marketplace
        initialSearchOverride={{ grad: countyName || cityName }}
        skipHero
        seoHeader={seoBanner}
      />
    </>
  );
}

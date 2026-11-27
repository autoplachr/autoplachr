import { connection } from "next/server";
import { getPublicFacet } from "../../../src/lib/public-catalog";
import type { Metadata } from "next";
import Link from "next/link";
import Marketplace from "../../marketplace";
import { euro } from "../../catalog";
import { JsonLd } from "../../../src/components/JsonLd";
import {
  findBrandBySlug,
  popularModelsForBrand,
  SEO_BRANDS,
  SEO_CITIES,
  SITE_NAME,
  SITE_URL,
  vehicleSeoPath,
} from "../../../src/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return SEO_BRANDS.map(b => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = findBrandBySlug(slug);
  if (!brand) return { title: "Rabljena vozila" };

  const title = `Rabljena ${brand.name} vozila u Hrvatskoj — Provjerene cijene i ponuda`;
  const description = `Pregledajte rabljena ${brand.name} vozila u Hrvatskoj, usporedite tržišne cijene, kilometre (CVH) i troškove uvoza na AUTOPLAC.HR.`;
  return {
    title,
    description,
    alternates: { canonical: `/rabljena-vozila/${brand.slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/rabljena-vozila/${brand.slug}`,
      locale: "hr_HR",
      type: "website",
    },
  };
}

export default async function BrandSeoPage({ params }: Props) {
  const { slug } = await params;
  const brand = findBrandBySlug(slug);
  const brandName = brand?.name ?? slug;
  if (process.env.AUTOPLAC_STATIC_EXPORT !== "1") await connection();
  const matching = await getPublicFacet("make", brandName);
  const avgPrice = matching.length
    ? Math.round(matching.reduce((s, v) => s + v.price, 0) / matching.length)
    : 0;
  const models = popularModelsForBrand(brandName);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: `Rabljena ${brandName} vozila`,
          item: `${SITE_URL}/rabljena-vozila/${slug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Rabljena ${brandName} vozila u Hrvatskoj`,
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
    <section className="shell pt-6 pb-2" aria-label={`Pregled marke ${brandName}`}>
      <div className="detail-panel rounded-xl flex flex-col gap-3">
        <nav className="text-[12.5px] text-[var(--muted)] flex flex-wrap items-center gap-1.5" aria-label="Putanja">
          <Link href="/" className="hover:underline">Početna</Link>
          <span>/</span>
          <span>Rabljena vozila</span>
          <span>/</span>
          <strong className="text-[var(--text)] !m-0">{brandName}</strong>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="!m-0 text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[var(--text)]">
              Rabljena {brandName} vozila u Hrvatskoj — Provjerene cijene i ponuda
            </h1>
            <p className="text-[13.5px] text-[var(--muted)] mt-1 !m-0">
              {matching.length > 0
                ? `${matching.length} aktivnih oglasa za marku ${brandName} · Prosječna cijena u ponudi: ${euro(avgPrice)}.`
                : `Katalog marke ${brandName} i besplatna tržišna procjena vrijednosti za sve modele u RH.`}
            </p>
          </div>
          <Link href="/procjena-cijene" className="btn secondary text-[13px]">
            Procijeni {brandName} cijenu →
          </Link>
        </div>

        {(models.length > 0 || SEO_CITIES.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] text-[12px]">
            {models.length > 0 && (
              <>
                <span className="font-semibold text-[var(--muted)]">Popularni modeli:</span>
                {models.map(m => (
                  <Link
                    key={m}
                    href={`/?marka=${encodeURIComponent(brandName)}&model=${encodeURIComponent(m)}#svi-oglasi`}
                    className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--hover)] text-[var(--spec)] hover:border-[#2563EB]"
                  >
                    {brandName} {m}
                  </Link>
                ))}
              </>
            )}
            <span className="font-semibold text-[var(--muted)] ml-1">Gradovi:</span>
            {SEO_CITIES.slice(0, 5).map(c => (
              <Link
                key={c.slug}
                href={`/rabljena-vozila/grad/${c.slug}`}
                className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--hover)] text-[var(--spec)] hover:border-[#2563EB]"
              >
                {c.city}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <Marketplace
        initialPath={`/rabljena-vozila/${slug}`}
        initialVehicles={matching.filter(vehicle => !vehicle.demo).slice(-24)}
        initialSearchOverride={{ marka: brandName }}
        skipHero
        seoHeader={seoBanner}
      />
    </>
  );
}

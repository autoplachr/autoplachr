import type { Metadata } from "next";
import Marketplace from "../../marketplace";
import { JsonLd } from "../../../src/components/JsonLd";
import { DEALERSHIP_DIRECTORY, findDealershipBySlug } from "../../../src/data/dealerships";
import { SITE_NAME, SITE_URL } from "../../../src/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return DEALERSHIP_DIRECTORY.map(d => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dealer = findDealershipBySlug(slug);
  if (!dealer) return { title: "Autokuća nije pronađena" };

  const title = `${dealer.name} (${dealer.city}) — Ponuda vozila i kontakt`;
  const description = `${dealer.name}, ${dealer.address}. ${dealer.description}`;
  return {
    title,
    description,
    alternates: { canonical: `/autokuce/${dealer.slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/autokuce/${dealer.slug}`,
      locale: "hr_HR",
      type: "website",
    },
  };
}

export default async function DealershipShowroomPage({ params }: Props) {
  const { slug } = await params;
  const dealer = findDealershipBySlug(slug);

  const jsonLd = dealer
    ? {
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        name: dealer.name,
        url: `${SITE_URL}/autokuce/${dealer.slug}`,
        telephone: dealer.phone,
        email: dealer.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: dealer.address,
          addressLocality: dealer.city,
          addressCountry: "HR",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: dealer.score,
          reviewCount: dealer.reviews,
        },
      }
    : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <Marketplace initialPath={`/autokuce/${slug}`} />
    </>
  );
}

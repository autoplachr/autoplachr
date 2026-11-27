import { notFound } from "next/navigation";
import { getPublicDealer } from "../../../src/lib/public-catalog";
import type { Metadata } from "next";
import Marketplace from "../../marketplace";
import { JsonLd } from "../../../src/components/JsonLd";
import { DEALERSHIP_DIRECTORY, findDealershipBySlug } from "../../../src/data/dealerships";
import { SITE_NAME, SITE_URL } from "../../../src/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEALERSHIP_DIRECTORY.map(d => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dealer = findDealershipBySlug(slug);
  if (!dealer) {
    const [vehicle] = await getPublicDealer(slug);
    if (!vehicle) return { title: "Autokuća nije pronađena" };
    const title = vehicle.seller;
    const description = `Aktivni oglasi i kontakt autokuće ${vehicle.seller} u gradu ${vehicle.city}.`;
    const canonical = `/autokuce/${slug}`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } };
  }

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

  const stock = dealer ? [] : await getPublicDealer(slug);
  if (!dealer && !stock.length) notFound();
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
      <JsonLd data={jsonLd ?? {
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        name: stock[0]?.seller,
        url: `${SITE_URL}/autokuce/${slug}`,
        address: { "@type": "PostalAddress", addressLocality: stock[0]?.city, streetAddress: stock[0]?.sellerAddress, addressCountry: "HR" },
      }} />
      <Marketplace initialPath={`/autokuce/${slug}`} initialVehicles={stock.slice(0, 24)} />
    </>
  );
}

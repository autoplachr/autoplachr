import { notFound, permanentRedirect } from "next/navigation";
import { getPublicListing } from "../../../src/lib/public-catalog";
import type { Metadata } from "next";
import Marketplace from "../../marketplace";
import { euro, registered, type Vehicle } from "../../catalog";
import { JsonLd } from "../../../src/components/JsonLd";
import {
  absoluteImageUrl,
  findVehicleBySeoSlug,
  SITE_NAME,
  SITE_URL,
  slugifyHr,
  staticCatalogVehicles,
  vehicleSeoSlug,
} from "../../../src/lib/seo";

type Props = { params: Promise<{ slug: string }> };


export function generateStaticParams() {
  return staticCatalogVehicles().map(vehicle => ({ slug: vehicleSeoSlug(vehicle) }));
}

function carJsonLd(vehicle: Vehicle, slug: string) {
  const url = `${SITE_URL}/oglas/${slug}`;
  const image = absoluteImageUrl(vehicle.photos[0]?.src || vehicle.photos[0]?.backup);
  return [
    {
      "@context": "https://schema.org",
      "@type": ["Vehicle", "Car"],
      name: vehicle.title,
      url,
      image: vehicle.photos.map(photo => absoluteImageUrl(photo.src || photo.backup)).filter(Boolean),
      brand: { "@type": "Brand", name: vehicle.make },
      model: vehicle.model,
      vehicleModelDate: vehicle.date.slice(0, 4),
      mileageFromOdometer: {
        "@type": "QuantitativeValue",
        value: vehicle.km,
        unitCode: "KMT",
      },
      fuelType: vehicle.fuel,
      vehicleTransmission: vehicle.gear,
      driveWheelConfiguration: vehicle.drive,
      vehicleEngine: {
        "@type": "EngineSpecification",
        enginePower: {
          "@type": "QuantitativeValue",
          value: vehicle.kw,
          unitCode: "KWT",
        },
        ...(vehicle.cc > 0
          ? {
              engineDisplacement: {
                "@type": "QuantitativeValue",
                value: vehicle.cc,
                unitCode: "CMQ",
              },
            }
          : {}),
      },
      ...(vehicle.color ? { color: vehicle.color } : {}),
      itemCondition: "https://schema.org/UsedCondition",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: vehicle.price,
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/UsedCondition",
        url,
        seller: {
          "@type": vehicle.dealer ? "AutoDealer" : "Person",
          name: vehicle.seller || "Privatni prodavač",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Rabljena vozila", item: `${SITE_URL}/#svi-oglasi` },
        {
          "@type": "ListItem",
          position: 3,
          name: vehicle.make,
          item: `${SITE_URL}/rabljena-vozila/${slugifyHr(vehicle.make)}`,
        },
        { "@type": "ListItem", position: 4, name: vehicle.model, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${vehicle.title} | ${SITE_NAME}`,
      url,
      image,
      inLanguage: "hr",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = findVehicleBySeoSlug(slug) ?? await getPublicListing(slug);
  if (!vehicle) return { title: "Oglas nije dostupan" };

  const title = `${vehicle.title} (${registered(vehicle.date)}) • ${euro(vehicle.price)}`;
  const description = `${vehicle.title}, ${registered(vehicle.date)}, ${vehicle.km.toLocaleString("hr-HR")} km, ${vehicle.kw} kW, ${vehicle.fuel}, ${vehicle.gear}, ${vehicle.city}. Provjerite tržišnu cijenu, povijest vozila i kontakt prodavača na AUTOPLAC.HR.`;
  const image = absoluteImageUrl(vehicle.photos[0]?.src || vehicle.photos[0]?.backup);
  const canonical = `/oglas/${vehicleSeoSlug(vehicle)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}${canonical}`,
      siteName: SITE_NAME,
      locale: "hr_HR",
      type: "website",
      images: [{ url: image, width: 1280, height: 800, alt: vehicle.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function VehicleListingPage({ params }: Props) {
  const { slug } = await params;
  const vehicle = findVehicleBySeoSlug(slug) ?? await getPublicListing(slug);
  if (!vehicle) {
    const seed = staticCatalogVehicles().find(item => item.id === slug);
    if (seed) permanentRedirect(`/oglas/${vehicleSeoSlug(seed)}`);
    notFound();
  }
  return (
    <>
      <JsonLd data={carJsonLd(vehicle, vehicleSeoSlug(vehicle))} />
      <Marketplace initialPath={`/oglas/${slug}`} initialDetailId={vehicle.id} initialVehicles={[vehicle]} />
    </>
  );
}

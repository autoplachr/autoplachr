import type { Metadata } from "next";
import Marketplace from "../marketplace";
import { JsonLd } from "../../src/components/JsonLd";
import { DEALERSHIP_DIRECTORY } from "../../src/data/dealerships";
import { SITE_NAME, SITE_URL } from "../../src/lib/seo";

export const metadata: Metadata = {
  title: "Provjerene autokuće i saloni rabljenih vozila u Hrvatskoj",
  description:
    "Imenik verificiranih autokuća i trgovaca rabljenim vozilima diljem Hrvatske. Pregledajte radno vrijeme, ocjene kupaca, R1 vozila i aktivne ponude salona.",
  alternates: { canonical: "/autokuce" },
  openGraph: {
    title: `Provjerene autokuće i saloni u RH | ${SITE_NAME}`,
    description:
      "Pronađite verificirane autokuće u Zagrebu, Splitu, Rijeci, Osijeku, Varaždinu, Puli i Slavonskom Brodu.",
    url: `${SITE_URL}/autokuce`,
    locale: "hr_HR",
    type: "website",
  },
};

export default function AutokucePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Provjerene autokuće u Hrvatskoj",
    numberOfItems: DEALERSHIP_DIRECTORY.length,
    itemListElement: DEALERSHIP_DIRECTORY.map((d, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/autokuce/${d.slug}`,
      name: `${d.name} — ${d.city}`,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Marketplace initialPath="/autokuce" />
    </>
  );
}

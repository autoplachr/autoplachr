import Marketplace from "./marketplace";
import { JsonLd } from "../src/components/JsonLd";
import { SITE_NAME, SITE_URL, staticCatalogVehicles, vehicleSeoPath } from "../src/lib/seo";

export default function Page() {
  const catalog = staticCatalogVehicles();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "hr",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "INO-TEH d.o.o. (AUTOPLAC.HR)",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Rabljena vozila u Hrvatskoj",
      numberOfItems: catalog.length,
      itemListElement: catalog.slice(0, 12).map((v, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}${vehicleSeoPath(v)}`,
        name: v.title,
        image: v.photos[0]?.src,
      })),
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <Marketplace />
    </>
  );
}

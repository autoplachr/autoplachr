import type { Metadata } from "next";
import Marketplace from "../marketplace";
import { JsonLd } from "../../src/components/JsonLd";
import { SEO_FAQS, SITE_NAME, SITE_URL } from "../../src/lib/seo";

const sectionMeta = {
  racun: {
    title: "Moj račun",
    description: "Upravljajte svojim oglasima, porukama i spremljenim vozilima na AUTOPLAC.HR.",
    noindex: true,
  },
  prijava: {
    title: "Prijava na račun",
    description: "Prijavite se putem Google računa ili e-pošte na AUTOPLAC.HR.",
    noindex: true,
  },
  registracija: {
    title: "Registracija računa",
    description: "Otvorite privatni ili poslovni račun autokuće na AUTOPLAC.HR.",
    noindex: true,
  },
  "predaj-oglas": {
    title: "Predaj oglas za vozilo (0 €)",
    description: "Besplatno predajte oglas za rabljeno vozilo na AUTOPLAC.HR uz AI prepoznavanje opreme i procjenu tržišne cijene.",
    noindex: true,
  },
  spremljeno: {
    title: "Spremljena vozila",
    description: "Vaša spremljena vozila i obavijesti o promjeni cijene na AUTOPLAC.HR.",
    noindex: true,
  },
  "procjena-cijene": {
    title: "Besplatna procjena tržišne cijene rabljenog vozila u RH",
    description:
      "Izračunajte realnu tržišnu cijenu vozila u Hrvatskoj uz detaljnu analizu kilometraže, opreme, starosti i troškova uvoza (PPMV).",
    noindex: false,
  },
  "ppmv-kalkulator": {
    title: "PPMV Kalkulator 2026 — Izračun trošarine za uvoz auta iz Njemačke i EU",
    description:
      "Informativni PPMV kalkulator 2026 za izračun posebnog poreza na motorna vozila pri unosu i uvozu automobila iz Njemačke i EU u Hrvatsku.",
    noindex: false,
  },
  "uvjeti-koristenja": {
    title: "Opći uvjeti poslovanja",
    description: "Opći uvjeti korištenja oglasnika rabljenih vozila AUTOPLAC.HR.",
    noindex: false,
  },
  privatnost: {
    title: "Politika privatnosti",
    description: "Informacije o obradi osobnih podataka i GDPR pravima na AUTOPLAC.HR.",
    noindex: false,
  },
  kolacici: {
    title: "Politika kolačića",
    description: "Pregled nužnih, analitičkih i marketinških kolačića na AUTOPLAC.HR.",
    noindex: false,
  },
  "dsa-prijava": {
    title: "Akt o digitalnim uslugama (DSA)",
    description: "Prijava nezakonitog sadržaja i transparentnost prema Aktu o digitalnim uslugama.",
    noindex: false,
  },
} as const;

type SectionKey = keyof typeof sectionMeta;
type Props = { params: Promise<{ section: SectionKey }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(sectionMeta).map(section => ({ section }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = (await params).section;
  const meta = sectionMeta[section];
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${section}` },
    openGraph: {
      title: `${meta.title} | ${SITE_NAME}`,
      description: meta.description,
      url: `${SITE_URL}/${section}`,
      locale: "hr_HR",
      type: "website",
    },
    robots: meta.noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function AccountOrLegalPage({ params }: Props) {
  const section = (await params).section;
  const isToolPage = section === "procjena-cijene" || section === "ppmv-kalkulator";

  const toolJsonLd = isToolPage
    ? [
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name:
            section === "ppmv-kalkulator"
              ? "AUTOPLAC.HR PPMV Kalkulator 2026"
              : "AUTOPLAC.HR Procjena tržišne cijene vozila",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "hr",
          url: `${SITE_URL}/${section}`,
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SEO_FAQS.map(item => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ]
    : null;

  return (
    <>
      {toolJsonLd && <JsonLd data={toolJsonLd} />}
      <Marketplace initialPath={"/" + section} />
    </>
  );
}

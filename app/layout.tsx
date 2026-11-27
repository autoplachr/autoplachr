import { AdSenseScript } from "../src/components/AdSenseScript";
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "../src/lib/seo";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AUTOPLAC.HR",
    template: "%s | AUTOPLAC.HR",
  },
  description:
    "Pronađite provjerena rabljena vozila u Hrvatskoj, usporedite stvarne tržišne cijene, provjerite kilometražu i izračunajte PPMV trošarinu uvoza iz EU.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AUTOPLAC.HR — Rabljena vozila i provjera cijena u Hrvatskoj",
    description:
      "Usporedite stvarne tržišne cijene rabljenih vozila u RH, provjerite CVH kilometre i izračunajte PPMV trošarinu na jednom mjestu.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "hr_HR",
    type: "website",
    images: [
      {
        url: "/hero-twilight.webp",
        width: 1200,
        height: 630,
        alt: "AUTOPLAC.HR — Rabljena vozila u Hrvatskoj",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AUTOPLAC.HR — Rabljena vozila i provjera cijena u Hrvatskoj",
    description:
      "Provjerena rabljena vozila, realne tržišne procjene i PPMV kalkulator za Hrvatsku.",
    images: ["/hero-twilight.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body>
        {children}
        <AdSenseScript />
      </body>
    </html>
  );
}

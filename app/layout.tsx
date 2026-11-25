import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "ŠASIJA.HR — Rabljena vozila",
  description: "Pronađite rabljena vozila, usporedite cijene i izračunajte troškove uvoza u Hrvatsku.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hr"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "ŠASIJA.HR — Rabljena vozila",
  description: "Pronađite rabljena vozila, usporedite cijene i izračunajte troškove uvoza u Hrvatsku.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hr" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem("sasija.theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}` }} />
  </head><body>{children}</body></html>;
}

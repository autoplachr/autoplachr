import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUTOPLAC.HR — Rabljena vozila",
  description: "Pronađite provjerena rabljena vozila u Hrvatskoj, usporedite cijene i izračunajte troškove uvoza.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hr" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem("autoplac.theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}` }} />
  </head><body>{children}</body></html>;
}

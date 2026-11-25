import { PageLoader } from "../src/components/PageLoader";
import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUTOPLAC.HR — Rabljena vozila",
  description: "Pronađite provjerena rabljena vozila u Hrvatskoj, usporedite cijene i izračunajte troškove uvoza.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hr" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem("autoplac.theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}
    try {
      if (location.pathname === "/" && !new URLSearchParams(location.search).has("oglas") && !new URLSearchParams(location.search).has("salon") && !matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem("autoplac_intro_seen")) {
        sessionStorage.setItem("autoplac_intro_seen","1");
        document.documentElement.dataset.intro = "enter";
        setTimeout(() => { delete document.documentElement.dataset.intro; }, 1350);
      }
    } catch {}` }} />
  </head><body><PageLoader/>{children}</body></html>;
}

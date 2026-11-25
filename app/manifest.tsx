import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AUTOPLAC.HR — Oglasnik rabljenih vozila",
    short_name: "AUTOPLAC.HR",
    description: "Pronađite provjerena rabljena vozila u Hrvatskoj, usporedite stvarne tržišne cijene i izračunajte PPMV trošarinu uvoza.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0C0E",
    theme_color: "#0B0C0E",
    lang: "hr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

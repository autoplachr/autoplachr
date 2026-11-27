import type { Metadata } from "next";
import Marketplace from "../marketplace";
import { getPublicCatalog } from "../../src/lib/public-catalog";
import { staticCatalogVehicles } from "../../src/lib/seo";

export const metadata: Metadata = {
  title: "Rabljena vozila",
  alternates: { canonical: "/rabljena-vozila" },
  openGraph: {
    title: "Rabljena vozila | AUTOPLAC.HR",
    description: "Pretražujte rabljena vozila u Hrvatskoj: cijene, kilometražu, godišta i povijest vozila.",
    url: "/rabljena-vozila",
  },
};

export default async function VehiclesPage() {
  const catalog = await getPublicCatalog().catch(() => staticCatalogVehicles());
  return <Marketplace initialPath="/rabljena-vozila" skipHero initialVehicles={catalog}
    seoHeader={<header className="mx-auto max-w-6xl px-4 pt-6">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--text)]">Rabljena vozila u Hrvatskoj</h1>
      <p className="mt-1 max-w-[65ch] text-sm text-[var(--muted)]">Filtrirajte ponudu prema cijeni, godištu, kilometraži, marci i lokaciji.</p>
    </header>} />;
}

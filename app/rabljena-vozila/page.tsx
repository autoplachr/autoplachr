import type { Metadata } from "next";
import Marketplace from "../marketplace";

export const metadata: Metadata = {
  title: "Rabljena vozila",
  alternates: { canonical: "/rabljena-vozila" },
};

export default function VehiclesPage() {
  return <Marketplace initialPath="/rabljena-vozila" skipHero />;
}

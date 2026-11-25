import type { Metadata } from "next";
import Marketplace from "../marketplace";

const titles = {
  racun: "Moj račun", prijava: "Prijava", registracija: "Registracija",
  "procjena-cijene": "Procjena cijene vozila",
  "uvjeti-koristenja": "Opći uvjeti poslovanja", privatnost: "Politika privatnosti",
  kolacici: "Politika kolačića", "dsa-prijava": "Akt o digitalnim uslugama",
};

type Props = { params: Promise<{ section: keyof typeof titles }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(titles).map(section => ({ section }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = (await params).section;
  return { title: titles[section] + " | AUTOPLAC.HR", robots: ["racun","prijava","registracija"].includes(section) ? {index:false} : undefined };
}
export default async function AccountOrLegalPage({ params }: Props) {
  return <Marketplace initialPath={"/" + (await params).section}/>;
}

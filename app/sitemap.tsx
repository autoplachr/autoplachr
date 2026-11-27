import type { MetadataRoute } from "next";
import { DEALERSHIP_DIRECTORY } from "../src/data/dealerships";
import { SEO_BRANDS, SEO_CITIES, SITE_URL, slugifyHr, vehicleSeoPath } from "../src/lib/seo";

import { getPublicCatalog } from "../src/lib/public-catalog";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getPublicCatalog();
  const brands = new Set(vehicles.map(vehicle => slugifyHr(vehicle.make)));
  const cities = new Set(vehicles.map(vehicle => slugifyHr(vehicle.city)));
  const sellers = new Set(vehicles.filter(vehicle => vehicle.dealer).map(vehicle => vehicle.seller));
  const dealers = new Set(DEALERSHIP_DIRECTORY.filter(dealer => sellers.has(dealer.name)).map(dealer => dealer.slug));
  for (const vehicle of vehicles) {
    if (vehicle.dealer && vehicle.dealershipId && !DEALERSHIP_DIRECTORY.some(dealer => dealer.name === vehicle.seller)) dealers.add(vehicle.dealershipId);
  }
  const now = new Date();
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/procjena-cijene`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ppmv-kalkulator`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/autokuce`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
  ];

  const brandRoutes: MetadataRoute.Sitemap = SEO_BRANDS.filter(brand => brands.has(brand.slug)).map(brand => ({
    url: `${SITE_URL}/rabljena-vozila/${brand.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const cityRoutes: MetadataRoute.Sitemap = SEO_CITIES.filter(city => cities.has(city.slug)).map(city => ({
    url: `${SITE_URL}/grad/${city.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const listingRoutes: MetadataRoute.Sitemap = vehicles.map(vehicle => ({
    url: `${SITE_URL}${vehicleSeoPath(vehicle)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  const dealershipRoutes: MetadataRoute.Sitemap = [...dealers].map(slug => ({
    url: `${SITE_URL}/autokuce/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...coreRoutes, ...dealershipRoutes, ...brandRoutes, ...cityRoutes, ...listingRoutes];
}

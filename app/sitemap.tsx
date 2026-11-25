import type { MetadataRoute } from "next";
import { DEALERSHIP_DIRECTORY } from "../src/data/dealerships";
import { SEO_BRANDS, SEO_CITIES, SITE_URL, staticCatalogVehicles, vehicleSeoPath } from "../src/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/procjena-cijene`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ppmv-kalkulator`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/autokuce`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${SITE_URL}/prijava`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const brandRoutes: MetadataRoute.Sitemap = SEO_BRANDS.map(brand => ({
    url: `${SITE_URL}/rabljena-vozila/${brand.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const cityRoutes: MetadataRoute.Sitemap = SEO_CITIES.map(city => ({
    url: `${SITE_URL}/rabljena-vozila/grad/${city.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const listingRoutes: MetadataRoute.Sitemap = staticCatalogVehicles().map(vehicle => ({
    url: `${SITE_URL}${vehicleSeoPath(vehicle)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  const dealershipRoutes: MetadataRoute.Sitemap = DEALERSHIP_DIRECTORY.map(dealer => ({
    url: `${SITE_URL}/autokuce/${dealer.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...coreRoutes, ...dealershipRoutes, ...brandRoutes, ...cityRoutes, ...listingRoutes];
}

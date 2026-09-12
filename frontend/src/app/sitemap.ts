import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Solo las páginas de contenido público — dashboard/login/register llevan
// noindex (ver sus layout.tsx) y no tiene sentido listarlas acá.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/legal`, priority: 0.3 },
  ];
}

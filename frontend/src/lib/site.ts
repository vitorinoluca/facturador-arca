// Todavía no hay dominio real (el proyecto corre en localhost — ver
// NOTAS-CONTINUACION.md). Configurar NEXT_PUBLIC_SITE_URL cuando se despliegue;
// hasta entonces todo el SEO absoluto (sitemap, robots, canonical) usa este
// fallback, igual que ya se hace con NEXT_PUBLIC_API_URL en lib/api.ts.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

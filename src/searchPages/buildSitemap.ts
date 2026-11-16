import { SITE } from "./copy";

export function buildSitemap(paths: readonly string[], lastmod: string): string {
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
import { parseUrl } from "./url/parseUrl";
import { findPage, SEARCH_PAGES } from "./searchPages/pages";
import { renderHead } from "./searchPages/renderHead";
import { buildSitemap } from "./searchPages/buildSitemap";
import { SITE } from "./searchPages/copy";

// Pre-render entry, built with `vite build --ssr` and driven by
// scripts/prerender.ts: every path below becomes a static HTML file so
// crawlers see the page's own head tags, intro and board.
export const PAGE_PATHS: readonly string[] = ["/", ...SEARCH_PAGES.map((p) => p.path)];

export function render(path: string): { html: string; head: string } {
  const initial = parseUrl(new URL(path, SITE));
  const html = renderToString(
    <StrictMode>
      <App initial={initial} />
    </StrictMode>,
  );
  return { html, head: renderHead(findPage(path)) };
}

export { buildSitemap };

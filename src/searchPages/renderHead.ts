import { SITE } from "./copy";
import type { SearchPage } from "./pages";

const HOME = {
  title: "Fretlab: guitar fretboard for scales, chords & modes",
  description:
    "Free key-aware guitar fretboard reference: scales, chord tones, CAGED positions and all seven modes in interval colors. Built for your music stand.",
  shareDescription:
    "Free key-aware guitar fretboard reference. Scales, chord tones, CAGED positions and modes in interval colors.",
  path: "/",
};

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// The head tags that differ per page. Tags every page shares (image, site
// name, theme colour, JSON-LD) stay in index.html.
export function renderHead(page: SearchPage | null): string {
  const title = page?.title ?? HOME.title;
  const description = page?.description ?? HOME.description;
  const shareDescription = page?.description ?? HOME.shareDescription;
  const url = `${SITE}${page?.path ?? HOME.path}`;
  const t = escape(title);
  const d = escape(description);
  const sd = escape(shareDescription);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${sd}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${sd}" />`,
  ].join("\n    ");
}

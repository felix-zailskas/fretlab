// Pre-renders every page into dist/ after `vite build` and the SSR build of
// src/entry-server.tsx (see the "build" script in package.json). Each page
// gets dist/<path>.html with its own head tags and server-rendered markup.
// GitHub Pages (and `vite preview`) serve it at the slash-less /<path>, the
// same URL as its canonical tag, with no redirect; dist/404.html is a copy of the home page so mistyped paths still
// open the app. The browser then starts the app with createRoot, replacing
// the static markup (no hydration).
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DIST = "dist";
const SSR = "dist-ssr";
const HEAD = /<!--app-head-->[\s\S]*?<!--\/app-head-->/;
const HTML = "<!--app-html-->";

type Entry = {
  render: (path: string) => { html: string; head: string };
  PAGE_PATHS: readonly string[];
  buildSitemap: (paths: readonly string[], lastmod: string) => string;
};

const template = await readFile(join(DIST, "index.html"), "utf8");
if (!HEAD.test(template) || !template.includes(HTML)) {
  throw new Error("index.html is missing the app-head or app-html placeholders");
}

const entry = (await import(join(process.cwd(), SSR, "entry-server.js"))) as Entry;

for (const path of entry.PAGE_PATHS) {
  const { html, head } = entry.render(path);
  // Replacer functions keep "$" in rendered text from acting as a pattern.
  const page = template.replace(HEAD, () => head).replace(HTML, () => html);
  if (path === "/") {
    await writeFile(join(DIST, "index.html"), page);
    await writeFile(join(DIST, "404.html"), page);
    continue;
  }
  const file = join(DIST, `${path}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page);
}

const lastmod = new Date().toISOString().slice(0, 10);
await writeFile(
  join(DIST, "sitemap.xml"),
  entry.buildSitemap(entry.PAGE_PATHS, lastmod),
);
await rm(SSR, { recursive: true, force: true });
console.log(`prerendered ${entry.PAGE_PATHS.length} pages into ${DIST}/`);

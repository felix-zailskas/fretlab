import { describe, it, expect } from "vitest";
import { SEARCH_PAGES, findPage } from "./pages";
import { renderHead } from "./renderHead";
import { buildSitemap } from "./buildSitemap";
import { allTopicPaths } from "../url/topicPaths";

const KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

describe("SEARCH_PAGES", () => {
  it("has one page per topic path", () => {
    expect(SEARCH_PAGES.map((p) => p.path)).toEqual(allTopicPaths().map((t) => t.path));
  });

  it("keeps titles within 60 and descriptions within 160 characters", () => {
    for (const p of SEARCH_PAGES) {
      expect(p.title.length, p.title).toBeLessThanOrEqual(60);
      expect(p.description.length, p.path).toBeLessThanOrEqual(160);
      expect(p.description.length, p.path).toBeGreaterThan(50);
    }
  });

  it("links only to pages that exist, and every page is reachable from every other", () => {
    const paths = new Set(SEARCH_PAGES.map((p) => p.path));
    for (const p of SEARCH_PAGES) {
      expect(p.related.length, p.path).toBeGreaterThanOrEqual(3);
      expect(p.related.length, p.path).toBeLessThanOrEqual(5);
      for (const r of p.related) expect(paths.has(r), `${p.path} → ${r}`).toBe(true);
      expect(p.related).not.toContain(p.path);
      expect(new Set(p.related).size, p.path).toBe(p.related.length);
    }
    const seen = new Set([SEARCH_PAGES[0].path]);
    const queue = [SEARCH_PAGES[0].path];
    while (queue.length) {
      const page = findPage(queue.shift()!)!;
      for (const r of page.related) {
        if (!seen.has(r)) {
          seen.add(r);
          queue.push(r);
        }
      }
    }
    expect(seen.size).toBe(SEARCH_PAGES.length);
  });

  it("answers in every key, naming the shape and its position", () => {
    for (const p of SEARCH_PAGES) {
      for (const key of KEYS)
        expect(p.answer(key).length, `${p.path} ${key}`).toBeGreaterThan(40);
    }
    const box1 = findPage("/scales/minor-pentatonic/e-shape")!;
    expect(box1.heading).toMatch(/E shape/);
    expect(box1.heading).toMatch(/box 1/);
    expect(box1.answer("A")).toMatch(/A C D E G/);
    expect(box1.answer("A")).toMatch(/fret 5/);
    expect(findPage("/scales/major-pentatonic/all-shapes")!.answer("G")).toMatch(
      /boxes 1 to 5/,
    );
  });

  it("states chord tones from the theory code", () => {
    expect(findPage("/chords/drop-2/m7")!.answer("D")).toMatch(/D F A C/);
    expect(findPage("/chords/triads/diminished/strings-1-2-3")!.answer("B")).toMatch(
      /B D F/,
    );
  });

  it("findPage is case- and trailing-slash-insensitive", () => {
    expect(findPage("/Chords/Drop-2/M7/")?.path).toBe("/chords/drop-2/m7");
    expect(findPage("/")).toBeNull();
  });
});

describe("renderHead", () => {
  it("writes the page's own tags with a query-free canonical", () => {
    const head = renderHead(findPage("/scales/minor-pentatonic/e-shape"));
    expect(head).toContain(
      "<title>Minor Pentatonic E Shape (Box 1) on Guitar | Fretlab</title>",
    );
    expect(head).toContain(
      '<link rel="canonical" href="https://fretlab.studio/scales/minor-pentatonic/e-shape" />',
    );
    expect(head).toContain(
      'property="og:url" content="https://fretlab.studio/scales/minor-pentatonic/e-shape"',
    );
    expect(head).toContain('name="twitter:title"');
  });

  it("escapes markup and keeps the home tags for /", () => {
    const home = renderHead(null);
    expect(home).toContain(
      "<title>Fretlab: guitar fretboard for scales, chords &amp; modes</title>",
    );
    expect(home).toContain('<link rel="canonical" href="https://fretlab.studio/" />');
    for (const p of SEARCH_PAGES)
      expect(renderHead(p)).not.toMatch(/&(?!amp;|quot;|lt;|gt;)/);
  });
});

describe("buildSitemap", () => {
  it("lists / and every page once with a lastmod", () => {
    const xml = buildSitemap(["/", ...SEARCH_PAGES.map((p) => p.path)], "2026-11-16");
    expect(xml.match(/<url>/g)).toHaveLength(SEARCH_PAGES.length + 1);
    expect(xml).toContain("<loc>https://fretlab.studio/</loc>");
    expect(xml).toContain(
      "<loc>https://fretlab.studio/chords/caged/minor/g-shape</loc>",
    );
    expect(xml).toContain("<lastmod>2026-11-16</lastmod>");
  });
});

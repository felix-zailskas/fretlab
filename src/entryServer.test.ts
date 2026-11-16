import { describe, it, expect } from "vitest";
import { render, PAGE_PATHS } from "./entry-server";

describe("entry-server render (no browser globals)", () => {
  it("lists / plus all 92 topic pages", () => {
    expect(PAGE_PATHS[0]).toBe("/");
    expect(PAGE_PATHS).toHaveLength(93);
  });

  it("renders the home page with the home head tags", () => {
    expect(typeof window).toBe("undefined");
    const { html, head } = render("/");
    expect(html).toContain("Fretlab");
    expect(head).toContain('<link rel="canonical" href="https://fretlab.studio/" />');
  });

  it("renders every topic page with its heading, strip and board", () => {
    for (const path of PAGE_PATHS.slice(1)) {
      const { html, head } = render(path);
      expect(html, path).toContain('data-testid="topic-strip"');
      expect(html, path).toContain('data-testid="related-topics"');
      expect(head, path).toContain(`https://fretlab.studio${path}`);
    }
    const { html } = render("/scales/minor-pentatonic/e-shape");
    expect(html).toContain("Minor Pentatonic E shape (box 1)");
    expect(html).toContain('data-testid="note-marker"');
  });
});

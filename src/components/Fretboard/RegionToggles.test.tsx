import { describe, it, expect } from "vitest";
import type { RegionToggle } from "./RegionToggles";
import { layoutRegionLabels } from "./regionLabelLayout";

const toggle = (id: string, low?: number, high?: number): RegionToggle => ({
  id,
  label: id,
  on: false,
  low,
  high,
  onToggle: () => {},
});

// 60 viewbox units per fret, starting at x = 0.
const centerX = (low: number, high: number) => ((low + high + 1) / 2) * 60;

describe("layoutRegionLabels", () => {
  it("centres labels over their regions when there's room", () => {
    const xs = layoutRegionLabels(
      [toggle("a", 0, 1), toggle("b", 6, 7)],
      centerX,
      0,
      900,
    );
    expect([xs.get("a"), xs.get("b")]).toEqual([60, 420]);
  });

  it("nudges overlapping labels apart, keeping their order", () => {
    const xs = layoutRegionLabels(
      [toggle("a", 2, 3), toggle("b", 2, 4)],
      centerX,
      0,
      900,
    );
    expect(xs.get("b")!).toBeGreaterThan(xs.get("a")! + 20);
  });

  it("pins regions without a span to the right edge", () => {
    const xs = layoutRegionLabels([toggle("a", 0, 1), toggle("off")], centerX, 0, 900);
    expect(xs.get("off")!).toBeGreaterThan(800);
    expect(xs.get("off")!).toBeLessThanOrEqual(900);
  });

  it("keeps every label inside the strip", () => {
    const toggles = [toggle("a", 13, 14), toggle("b", 14, 14), toggle("c")];
    const xs = layoutRegionLabels(toggles, centerX, 0, 900);
    for (const x of xs.values()) expect(x).toBeLessThan(900);
  });
});

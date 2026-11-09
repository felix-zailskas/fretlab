import type { RegionToggle } from "./RegionToggles";

// Approximate label width in viewbox units: used only to keep labels from
// overlapping where regions overlap (P1/P2 share a fret).
function labelWidth(t: RegionToggle): number {
  return 18 + 7.5 * (t.label.length + (t.sub ? t.sub.length + 1 : 0));
}

const GAP = 6;

// Pure: centre x for every toggle. On-board labels sit over their region and
// are nudged right just enough to not overlap; off-screen ones queue at the
// right edge. If the row overflows on the right, everything shifts left.
export function layoutRegionLabels(
  toggles: ReadonlyArray<RegionToggle>,
  regionCenterX: (low: number, high: number) => number,
  minX: number,
  maxX: number,
): Map<string, number> {
  const placed = toggles
    .filter((t) => t.low !== undefined && t.high !== undefined)
    .map((t) => ({ t, x: regionCenterX(t.low!, t.high!) }))
    .sort((a, b) => a.x - b.x);
  const pinned = toggles.filter((t) => t.low === undefined || t.high === undefined);

  const items: { id: string; x: number; w: number }[] = [];
  let right = minX;
  for (const { t, x } of placed) {
    const w = labelWidth(t);
    const cx = Math.max(x, right + w / 2);
    items.push({ id: t.id, x: cx, w });
    right = cx + w / 2 + GAP;
  }
  for (const t of pinned) {
    const w = labelWidth(t);
    const cx = Math.max(maxX - w / 2, right + w / 2);
    items.push({ id: t.id, x: cx, w });
    right = cx + w / 2 + GAP;
  }
  // Pull the tail back inside the strip, keeping order and gaps.
  let limit = maxX;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.x + it.w / 2 > limit) it.x = limit - it.w / 2;
    limit = it.x - it.w / 2 - GAP;
  }
  return new Map(items.map((it) => [it.id, it.x]));
}

import { describe, it, expect } from "vitest";
import {
  buildCagedPlacements,
  CAGED_GRIPS,
  dedupeMarkers,
  type CagedPlacement,
  type CagedQuality,
} from "./cagedShapes";
import { QUALITY_INTERVALS, type ChordToneSource } from "./harmony";
import { getNoteAtFret, getNoteIndex, CHROMATIC_SCALE } from "./notes";
import { TUNINGS } from "./tuning";
import { CAGED_POSITIONS, getPositionWindows, type CagedShape } from "./positions";

const STANDARD = TUNINGS.standard;
const STANDARD_OPEN_SHAPE_STRING: Record<number, string> = {
  1: "E",
  2: "B",
  3: "G",
  4: "D",
  5: "A",
  6: "E",
};

function chord(root: string, quality: CagedQuality): ChordToneSource {
  const rootIdx = getNoteIndex(root);
  return {
    quality,
    notes: QUALITY_INTERVALS[quality].map((i) => CHROMATIC_SCALE[(rootIdx + i) % 12]),
  } as ChordToneSource;
}

function place(root: string, quality: CagedQuality, shapes: CagedShape[]) {
  return buildCagedPlacements({
    tuning: STANDARD,
    chord: chord(root, quality),
    key: root,
    shapes,
    startFret: 0,
    endFret: 15,
  });
}

const fingerprint = (p: CagedPlacement) =>
  p.markers
    .map((m) => `s${m.string}f${m.fret}:${m.role}`)
    .sort()
    .join(" ");

describe("CAGED_GRIPS registry", () => {
  for (const [quality, grips] of Object.entries(CAGED_GRIPS) as [
    CagedQuality,
    (typeof CAGED_GRIPS)[CagedQuality],
  ][]) {
    for (const [shape, grip] of Object.entries(grips)) {
      describe(`${quality} ${shape}-shape`, () => {
        // Voice the grip with its root at fret 5 on the root string so all
        // offsets land on real frets.
        const rootOpen = STANDARD_OPEN_SHAPE_STRING[grip!.rootString];
        const pitches = grip!.positions.map((p) =>
          getNoteIndex(
            getNoteAtFret(STANDARD_OPEN_SHAPE_STRING[p.string], 5 + p.fretOffset),
          ),
        );
        const rootPc = getNoteIndex(getNoteAtFret(rootOpen, 5));

        // Grips may omit the fifth (C7 x32310), as chord charts commonly do;
        // every other chord tone must sound and nothing else may.
        it("voices the quality's pitch classes (fifth optional)", () => {
          const tones = QUALITY_INTERVALS[quality].map((i) => (rootPc + i) % 12);
          const required = tones.filter((_, i) => i !== 2);
          expect(pitches.every((pc) => tones.includes(pc))).toBe(true);
          for (const pc of required) expect(pitches).toContain(pc);
        });

        it("has the root on its lowest played string", () => {
          const lowest = Math.max(...grip!.positions.map((p) => p.string));
          expect(lowest).toBe(grip!.rootString);
          const anchor = grip!.positions.find((p) => p.string === lowest)!;
          expect(anchor.role).toBe("root");
          expect(anchor.fretOffset).toBe(0);
        });

        it("plays at most one note per string", () => {
          const strings = grip!.positions.map((p) => p.string);
          expect(new Set(strings).size).toBe(strings.length);
        });
      });
    }
  }

  it("has no grips for diminished triads", () => {
    expect(Object.keys(CAGED_GRIPS.dim)).toHaveLength(0);
  });
});

describe("buildCagedPlacements", () => {
  it("F major E-shape is the 1-3-3-2-1-1 barre at fret 1", () => {
    const [first] = place("F", "maj", ["E"]);
    expect(first.markers.map((m) => [m.string, m.fret, m.note])).toEqual([
      [0, 1, "F"],
      [1, 3, "C"],
      [2, 3, "F"],
      [3, 2, "A"],
      [4, 1, "C"],
      [5, 1, "F"],
    ]);
    expect(first.barre).toEqual({ fret: 1, stringLow: 0, stringHigh: 5 });
    expect(first.unplayedStrings).toEqual([]);
    expect(first).toMatchObject({ shape: "E", low: 1, high: 3, id: "E-1" });
  });

  it("C major C-shape at the nut is the open C chord with no barre", () => {
    const [open] = place("C", "maj", ["C"]);
    expect(open.low).toBe(0);
    expect(open.barre).toBeNull();
    expect(open.unplayedStrings).toEqual([0]);
  });

  it("F major C-shape barres strings 1–3 at fret 5", () => {
    const [cShape] = place("F", "maj", ["C"]);
    expect(cShape.barre).toEqual({ fret: 5, stringLow: 3, stringHigh: 5 });
  });

  it("does not draw a barre across an unplayed string (F maj7 E-shape 1x221x)", () => {
    const [eShape] = place("F", "maj7", ["E"]);
    expect(eShape.low).toBe(1);
    expect(eShape.unplayedStrings).toEqual([1, 5]);
    expect(eShape.barre).toBeNull();
  });

  it("returns nothing for a diminished triad", () => {
    expect(place("E", "dim", ["C", "A", "G", "E", "D"])).toEqual([]);
  });

  it("orders placements C-A-G-E-D regardless of the requested order", () => {
    const shapes = place("F", "maj", ["E", "A", "C"]).map((p) => p.shape);
    expect(shapes).toEqual(
      [...shapes].sort((a, b) => "CAGED".indexOf(a) - "CAGED".indexOf(b)),
    );
  });

  it("drops placements that don't fit the fret range", () => {
    const placements = buildCagedPlacements({
      tuning: STANDARD,
      chord: chord("F", "maj"),
      key: "F",
      shapes: ["E"],
      startFret: 2,
      endFret: 12,
    });
    // fret-1 barre is clipped by startFret 2; the 13 one by endFret 12.
    expect(placements).toEqual([]);
  });

  it("marks notes on a disabled string as muted", () => {
    const [first] = buildCagedPlacements({
      tuning: STANDARD,
      chord: chord("F", "maj"),
      key: "F",
      shapes: ["E"],
      enabledStrings: new Set([1, 2, 3, 4, 5]),
      startFret: 0,
      endFret: 15,
    });
    expect(first.markers.find((m) => m.string === 0)!.role).toBe("muted");
    expect(first.markers.find((m) => m.string === 1)!.role).toBe("fifth");
  });

  it("dedupes markers shared by overlapping shapes", () => {
    const placements = place("F", "maj", ["D", "E"]);
    const all = placements.flatMap((p) => p.markers);
    const unique = dedupeMarkers(placements);
    const keys = unique.map((m) => `${m.string}-${m.fret}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(unique.length).toBeLessThan(all.length);
  });

  // Ties the hand-written grips to Scale Positions: the X-shape grip of a
  // major or dominant chord sits inside the X-shape box of that chord's major
  // key. Minor-family grips aren't asserted: Scale Positions boxes are major
  // (parent-key) boxes, so a minor grip's shape name refers to the grip's
  // origin, not a box.
  describe("sits inside its Scale Positions box", () => {
    for (const quality of ["maj", "7"] as const) {
      for (const shape of Object.keys(CAGED_GRIPS[quality]) as CagedShape[]) {
        const position = CAGED_POSITIONS.find((p) => p.shape === shape)!.id;
        for (const root of CHROMATIC_SCALE) {
          it(`${root}${quality} ${shape}-shape`, () => {
            const windows = getPositionWindows(root, position, -12, 40, STANDARD);
            for (const p of place(root, quality, [shape])) {
              const inside = windows.some(([lo, hi]) => p.low >= lo && p.high <= hi);
              expect(inside, fingerprint(p)).toBe(true);
            }
          });
        }
      }
    }
  });
});

// src/theory/tuning.ts
import type { ChromaticNote } from "./notes";
import type { ViewId } from "../views/types";

export type TuningId = "standard" | "open-g";

// A tuning is its open-string notes ordered low-pitch → high-pitch (string 6
// → string 1 in standard guitar nomenclature).
export type Tuning = {
  id: TuningId;
  name: string;
  strings: readonly [
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
  ];
};

// Single source of truth for all preset tunings. Keying by TuningId means the
// compiler enforces that every id has a definition and vice-versa.
export const TUNINGS: Record<TuningId, Tuning> = {
  standard: {
    id: "standard",
    name: "Standard",
    strings: ["E", "A", "D", "G", "B", "E"],
  },
  "open-g": {
    id: "open-g",
    name: "Open G",
    strings: ["D", "G", "D", "G", "B", "D"],
  },
};

// Per-tuning view support. Adding a tuning = add a row. Adding a view = touch
// each row's set. Compiler enforces both.
export const VIEWS_BY_TUNING: Record<TuningId, ReadonlySet<ViewId>> = {
  standard: new Set<ViewId>(["note-map", "scale-positions", "chord-shapes"]),
  "open-g": new Set<ViewId>(["note-map"]),
};

// The only predicate any view-gating logic should need.
export function tuningSupportsView(tuningId: TuningId, view: ViewId): boolean {
  return VIEWS_BY_TUNING[tuningId].has(view);
}

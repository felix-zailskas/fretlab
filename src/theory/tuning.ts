import { getNoteIndex, type ChromaticNote } from "./notes";
import type { ViewId } from "../views/types";

export type TuningId =
  | "standard"
  | "eb-standard"
  | "d-standard"
  | "csharp-standard"
  | "open-g"
  | "open-d"
  | "open-e"
  | "open-a"
  | "open-c"
  | "open-dm"
  | "open-gm"
  | "drop-d"
  | "double-drop-d"
  | "drop-c"
  | "drop-b"
  | "dadgad"
  | "all-fourths"
  | "nst";

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
  "eb-standard": {
    id: "eb-standard",
    name: "Eb Standard",
    strings: ["D#", "G#", "C#", "F#", "A#", "D#"],
  },
  "d-standard": {
    id: "d-standard",
    name: "D Standard",
    strings: ["D", "G", "C", "F", "A", "D"],
  },
  "csharp-standard": {
    id: "csharp-standard",
    name: "C# Standard",
    strings: ["C#", "F#", "B", "E", "G#", "C#"],
  },
  "open-g": { id: "open-g", name: "Open G", strings: ["D", "G", "D", "G", "B", "D"] },
  "open-d": { id: "open-d", name: "Open D", strings: ["D", "A", "D", "F#", "A", "D"] },
  "open-e": { id: "open-e", name: "Open E", strings: ["E", "B", "E", "G#", "B", "E"] },
  "open-a": { id: "open-a", name: "Open A", strings: ["E", "A", "E", "A", "C#", "E"] },
  "open-c": { id: "open-c", name: "Open C", strings: ["C", "G", "C", "G", "C", "E"] },
  "open-dm": {
    id: "open-dm",
    name: "Open Dm",
    strings: ["D", "A", "D", "F", "A", "D"],
  },
  "open-gm": {
    id: "open-gm",
    name: "Open Gm",
    strings: ["D", "G", "D", "G", "A#", "D"],
  },
  "drop-d": { id: "drop-d", name: "Drop D", strings: ["D", "A", "D", "G", "B", "E"] },
  "double-drop-d": {
    id: "double-drop-d",
    name: "Double Drop D",
    strings: ["D", "A", "D", "G", "B", "D"],
  },
  "drop-c": { id: "drop-c", name: "Drop C", strings: ["C", "G", "C", "F", "A", "D"] },
  "drop-b": {
    id: "drop-b",
    name: "Drop B",
    strings: ["B", "F#", "B", "E", "G#", "C#"],
  },
  dadgad: { id: "dadgad", name: "DADGAD", strings: ["D", "A", "D", "G", "A", "D"] },
  "all-fourths": {
    id: "all-fourths",
    name: "All Fourths",
    strings: ["E", "A", "D", "G", "C", "F"],
  },
  nst: {
    id: "nst",
    name: "New Standard (NST)",
    strings: ["C", "G", "D", "A", "E", "G"],
  },
};

export type TuningCategory = "standard" | "open" | "drop" | "modal";

// Display ordering and grouping for the TuningSelector. Single source of truth;
// adding a new tuning means appending it to the right group's `ids` array.
export const TUNING_GROUPS: ReadonlyArray<{
  category: TuningCategory;
  label: string;
  ids: ReadonlyArray<TuningId>;
}> = [
  {
    category: "standard",
    label: "Standard",
    ids: ["standard", "eb-standard", "d-standard", "csharp-standard"],
  },
  {
    category: "open",
    label: "Open Tunings",
    ids: ["open-g", "open-d", "open-e", "open-a", "open-c", "open-dm", "open-gm"],
  },
  {
    category: "drop",
    label: "Drop Tunings",
    ids: ["drop-d", "double-drop-d", "drop-c", "drop-b"],
  },
  {
    category: "modal",
    label: "Modal & Other",
    ids: ["dadgad", "all-fourths", "nst"],
  },
];

// Standard tuning's adjacent-string intervals in semitones (low → high). The
// CAGED system, drop-2/drop-3 voicings, and most "shape" pedagogy depend on
// this exact pattern. Any tuning that preserves it can reuse those views;
// any tuning that breaks it cannot (the shapes would teach incorrect
// fingerings).
const STANDARD_INTERVALS: readonly number[] = [5, 5, 5, 4, 5];

function isCagedCompatible(tuning: Tuning): boolean {
  for (let i = 0; i < STANDARD_INTERVALS.length; i++) {
    const semis =
      (getNoteIndex(tuning.strings[i + 1]) - getNoteIndex(tuning.strings[i]) + 12) % 12;
    if (semis !== STANDARD_INTERVALS[i]) return false;
  }
  return true;
}

const CAGED_VIEWS = new Set<ViewId>(["note-map", "scale-positions", "chord-shapes"]);
const NOTE_MAP_ONLY = new Set<ViewId>(["note-map"]);

// Per-tuning view support. Derived from each tuning's interval pattern, so
// adding a new tuning to TUNINGS automatically determines its supported views
// from the strings — no manual flag to keep in sync.
export const VIEWS_BY_TUNING: Record<TuningId, ReadonlySet<ViewId>> = (() => {
  const result = {} as Record<TuningId, ReadonlySet<ViewId>>;
  for (const id of Object.keys(TUNINGS) as TuningId[]) {
    result[id] = isCagedCompatible(TUNINGS[id]) ? CAGED_VIEWS : NOTE_MAP_ONLY;
  }
  return result;
})();

// The only predicate any view-gating logic should need.
export function tuningSupportsView(tuningId: TuningId, view: ViewId): boolean {
  return VIEWS_BY_TUNING[tuningId].has(view);
}

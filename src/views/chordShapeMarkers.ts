import {
  buildCagedPlacements,
  CAGED_SHAPE_ORDER,
  dedupeMarkers,
} from "../theory/cagedShapes";
import type { CagedShape } from "../theory/positions";
import {
  buildChordShapeMarkers,
  type ChordShapesMode,
  type Inversion,
  type SeventhInversion,
  type SeventhStringSet,
  type StringSet,
  type VoicingSystem,
} from "../theory/chordShapes";
import { triadOf, type ChordToneSource } from "../theory/harmony";
import type { Mode } from "../theory/modes";
import type { Tuning } from "../theory/tuning";
import type { HighlightableRole, NoteMarker } from "../theory/types";

export type ChordShapeMarkerOptions = {
  isCaged: boolean;
  mode: ChordShapesMode;
  tuning: Tuning;
  modalMode: Mode;
  selectedKey: string;
  cagedShapes: ReadonlySet<CagedShape>;
  stringSets: ReadonlySet<StringSet>;
  inversions: ReadonlySet<Inversion>;
  voicingSystem: VoicingSystem;
  seventhStringSets: ReadonlyArray<SeventhStringSet>;
  seventhInversions: ReadonlySet<SeventhInversion>;
  enabledHighlights: ReadonlySet<HighlightableRole>;
  enabledStrings: ReadonlySet<number>;
  startFret: number;
  endFret: number;
};

// The Chord Shapes board's markers for one chord under the view's current
// settings. Used for the selected chord and, during a progression preview,
// for the next one.
export function chordShapeMarkersFor(
  chord: ChordToneSource | null,
  o: ChordShapeMarkerOptions,
): NoteMarker[] {
  if (!chord) return [];
  const common = {
    tuning: o.tuning,
    modalMode: o.modalMode,
    key: o.selectedKey,
    enabledStrings: o.enabledStrings,
    startFret: o.startFret,
    endFret: o.endFret,
  };
  let markers: NoteMarker[];
  if (o.isCaged) {
    // CAGED always voices the chord as selected: a secondary dominant keeps
    // its 7th even in triads mode (its resolution hinges on that 7th).
    markers = dedupeMarkers(
      buildCagedPlacements({
        ...common,
        chord,
        shapes: CAGED_SHAPE_ORDER.filter((s) => o.cagedShapes.has(s)),
      }),
    );
  } else if (o.mode === "triads") {
    markers = buildChordShapeMarkers({
      ...common,
      mode: "triads",
      // Chord Shapes only voices triads; a secondary dominant drops its 7th.
      chord: triadOf(chord),
      stringSets: Array.from(o.stringSets),
      inversions: Array.from(o.inversions),
    });
  } else {
    markers = buildChordShapeMarkers({
      ...common,
      mode: "sevenths",
      voicingSystem: o.voicingSystem,
      chord,
      stringSets: [...o.seventhStringSets],
      inversions: Array.from(o.seventhInversions),
    });
  }
  // Demote unselected roles to plain scale tones instead of removing them —
  // the shape stays recognizable while the focus is on the role(s) being
  // studied, matching Note Map / Scale Positions. "muted" (string toggled
  // off) carries different intent and is kept as-is.
  return markers.map((m) =>
    m.role === "muted" || o.enabledHighlights.has(m.role as HighlightableRole)
      ? m
      : { ...m, role: "scale" as const },
  );
}

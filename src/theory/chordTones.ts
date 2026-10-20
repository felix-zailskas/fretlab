import type { HighlightableRole } from "../components/Legend";
import {
  buildDiatonicSpellingMap,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
  type SpelledNote,
  ALL_NOTES_KEY,
} from "./notes";
import type { Tuning } from "./tuning";
import { isInPositionWindow, type PositionId } from "./positions";
import type { ChordToneSource } from "./harmony";
import {
  getCharacteristicNoteIndexSet,
  MODE_INTERVALS,
  parentMajorOf,
  type Mode,
} from "./modes";
import type { NoteDisplayRole, NoteMarker } from "./types";

// Roles the Legend can toggle off (demoted to 'scale' when their toggle is
// disabled). Both NoteMapView and ScalePositionsView read from this single set.
export const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  "root",
  "third",
  "fifth",
  "seventh",
]);

// Resolves the visual role of a note given an optional chord context.
// - With a chord: returns the chord-relative role ('root'/'third'/'fifth'/
//   'seventh'), or 'scale' if the note is not a chord tone.
// - Without a chord: returns 'scale'. Deselecting the chord card is the
//   user-facing "clear highlights" shortcut — every in-key note falls back to
//   the plain scale role, and Legend toggles have nothing to demote.
// Matching is by pitch class, so enharmonic spellings resolve the same way.
export function roleFromChordTone(
  note: string,
  chord: Pick<ChordToneSource, "notes"> | null,
): NoteDisplayRole {
  if (!chord) return "scale";
  const noteIdx = getNoteIndex(note);
  if (noteIdx === getNoteIndex(chord.notes[0])) return "root";
  if (noteIdx === getNoteIndex(chord.notes[1])) return "third";
  if (noteIdx === getNoteIndex(chord.notes[2])) return "fifth";
  if (chord.notes.length === 4 && noteIdx === getNoteIndex(chord.notes[3])) {
    return "seventh";
  }
  return "scale";
}

export type KeyChordSpelling = {
  // Key/mode spelling per pitch class (the 7 in-key pitch classes only).
  key: ReadonlyMap<number, SpelledNote>;
  // The chord's own spelling per pitch class (empty without a chord).
  chord: ReadonlyMap<number, SpelledNote>;
  // Letters of out-of-key chord tones. An in-key, non-chord note on one of
  // these letters is hidden (C is hidden when A7 contributes C#).
  clashingLetters: ReadonlySet<string>;
};

export function buildKeyChordSpelling(
  key: string,
  mode: Mode,
  chord: Pick<ChordToneSource, "notes"> | null,
): KeyChordSpelling {
  const keyMap = buildDiatonicSpellingMap(key as SpelledNote, MODE_INTERVALS[mode]);
  const chordMap = new Map<number, SpelledNote>();
  const clashingLetters = new Set<string>();
  for (const note of chord?.notes ?? []) {
    const pc = getNoteIndex(note);
    chordMap.set(pc, note);
    if (!keyMap.has(pc)) clashingLetters.add(note[0]);
  }
  return { key: keyMap, chord: chordMap, clashingLetters };
}

// Decides whether the note at pitch class `pc` renders, and how it is
// labelled. Chord tones always render with the chord's spelling; other
// in-key notes render with the key's spelling unless their letter clashes
// with an out-of-key chord tone; everything else is dropped (null).
export function spellKeyOrChordTone(
  pc: number,
  spelling: KeyChordSpelling,
): { label: SpelledNote; isOutsideKey: boolean } | null {
  const chordLabel = spelling.chord.get(pc);
  const keyLabel = spelling.key.get(pc);
  if (chordLabel !== undefined) {
    return { label: chordLabel, isOutsideKey: keyLabel === undefined };
  }
  if (keyLabel === undefined) return null;
  if (spelling.clashingLetters.has(keyLabel[0])) return null;
  return { label: keyLabel, isOutsideKey: false };
}

function demoteDisabledRole(
  role: NoteDisplayRole,
  enabledHighlights: ReadonlySet<HighlightableRole>,
): NoteDisplayRole {
  if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role as HighlightableRole)) {
    return "scale"; // Legend toggle off → demote
  }
  return role;
}

export type BuildChordToneMarkersInput = {
  tuning: Tuning;
  key: string;
  chord: ChordToneSource | null;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: ReadonlySet<HighlightableRole>;
  enabledStrings: ReadonlySet<number>;
  startFret: number;
  endFret: number;
  // Optional — defaults to 'ionian', preserving existing behavior. When
  // 'ionian', the in-mode check, parent-major anchoring, and characteristic
  // overlay all degrade to identical output of the pre-modal pipeline.
  mode?: Mode;
};

// Pure function: given the Chord-Tones view's full input, returns the
// NoteMarker[] that the Fretboard should render. Mirrors the pipeline
// described in the spec under "Marker Computation".
//
// Returns [] when:
// - key is the "All Notes" sentinel (the chord-tones concept requires a key)
// - positions is empty (the view's identity is the box; no box, no markers)
//
// A fret is "in window" if it falls in ANY of the selected positions. When
// showContext=true, notes outside the union of windows render with role
// 'muted' (faint context); when false, they're dropped entirely.
//
// Chord tones outside the key/mode (secondary dominants, borrowed chords)
// are kept, labelled with the chord's spelling and flagged isOutsideKey.
//
// In modal mode (mode !== 'ionian'), position windows are anchored on the
// parent major's tonic (parentMajorOf), and notes flagged by
// getCharacteristicNotes are stamped with isCharacteristic=true.
export function buildChordToneMarkers({
  tuning,
  key,
  chord,
  positions,
  showContext,
  enabledHighlights,
  enabledStrings,
  startFret,
  endFret,
  mode = "ionian",
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return [];
  if (positions.length === 0) return [];

  const parentKey = parentMajorOf(key, mode);
  const characteristicSet = getCharacteristicNoteIndexSet(key, mode);
  const spelling = buildKeyChordSpelling(key, mode, chord);

  const result: NoteMarker[] = [];

  for (let stringIndex = 0; stringIndex < tuning.strings.length; stringIndex++) {
    const openString = tuning.strings[stringIndex];
    for (let fret = startFret; fret <= endFret; fret++) {
      const note = getNoteAtFret(openString, fret);
      const pc = getNoteIndex(note);
      const spelled = spellKeyOrChordTone(pc, spelling);
      if (spelled === null) continue;

      const inWindow = positions.some((p) =>
        isInPositionWindow(parentKey, p, fret, startFret, endFret, tuning),
      );
      if (!inWindow && !showContext) continue; // hide outside-position notes

      let role = demoteDisabledRole(roleFromChordTone(note, chord), enabledHighlights);
      if (!inWindow) {
        role = "muted"; // outside-window context override
      }

      const finalRole = enabledStrings.has(stringIndex) ? role : "muted";

      result.push({
        string: stringIndex,
        fret,
        note: spelled.label,
        role: finalRole,
        ...(characteristicSet.has(pc) ? { isCharacteristic: true } : {}),
        ...(spelled.isOutsideKey ? { isOutsideKey: true } : {}),
      });
    }
  }

  return result;
}

export type BuildNoteMapMarkersInput = {
  tuning: Tuning;
  key: string;
  mode: Mode;
  accidentalStyle: AccidentalStyle;
  chord: ChordToneSource | null;
  enabledHighlights: ReadonlySet<HighlightableRole>;
  enabledStrings: ReadonlySet<number>;
  startFret: number;
  endFret: number;
};

// Note Map pipeline. With the "All Notes" key every fret renders as a plain
// scale note spelled by accidentalStyle. With a key, in-key notes and the
// selected chord's tones render exactly as in buildChordToneMarkers, minus
// the position windows.
export function buildNoteMapMarkers({
  tuning,
  key,
  mode,
  accidentalStyle,
  chord,
  enabledHighlights,
  enabledStrings,
  startFret,
  endFret,
}: BuildNoteMapMarkersInput): NoteMarker[] {
  const showAll = key === ALL_NOTES_KEY;
  const characteristicSet = showAll
    ? new Set<number>()
    : getCharacteristicNoteIndexSet(key, mode);
  const spelling = showAll ? null : buildKeyChordSpelling(key, mode, chord);

  const result: NoteMarker[] = [];
  for (let stringIndex = 0; stringIndex < tuning.strings.length; stringIndex++) {
    const openString = tuning.strings[stringIndex];
    for (let fret = startFret; fret <= endFret; fret++) {
      const note = getNoteAtFret(openString, fret);
      const pc = getNoteIndex(note);

      let label: string;
      let role: NoteDisplayRole;
      let isOutsideKey = false;
      if (spelling === null) {
        label = getDisplayName(note, key, accidentalStyle);
        role = "scale";
      } else {
        const spelled = spellKeyOrChordTone(pc, spelling);
        if (spelled === null) continue;
        label = spelled.label;
        isOutsideKey = spelled.isOutsideKey;
        role = demoteDisabledRole(roleFromChordTone(note, chord), enabledHighlights);
      }

      result.push({
        string: stringIndex,
        fret,
        note: label,
        role: enabledStrings.has(stringIndex) ? role : "muted",
        ...(characteristicSet.has(pc) ? { isCharacteristic: true } : {}),
        ...(isOutsideKey ? { isOutsideKey: true } : {}),
      });
    }
  }
  return result;
}

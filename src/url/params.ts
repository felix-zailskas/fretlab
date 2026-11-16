import type { ShareState } from "./shareState";
import {
  CAGED_POSITIONS,
  positionForShape,
  type CagedShape,
} from "../theory/positions";
import { MODES } from "../theory/modes";
import { ALL_NOTES_KEY } from "../theory/notes";
import type { ChordRef, ChordTier } from "../theory/harmony";
import type { HighlightableRole } from "../theory/types";
import type { ViewId } from "../views/types";
import type {
  Inversion,
  SeventhInversion,
  StringSet,
  VoicingSystem,
} from "../theory/chordShapes";
import type { SeventhStringPosition } from "../views/useChordShapesState";
import { MAX_FRET } from "../theory/constants";

// One query param of URL contract v1: how its field is written and read.
// decode returns undefined for anything invalid, so that field keeps its
// default. Names and values here are a public contract: never rename one
// without keeping the old spelling as an alias.
type Param<K extends keyof ShareState> = {
  name: string;
  field: K;
  encode: (value: ShareState[K]) => string;
  decode: (raw: string) => ShareState[K] | undefined;
};

function enumParam<K extends keyof ShareState>(
  name: string,
  field: K,
  pairs: ReadonlyArray<readonly [string, ShareState[K]]>,
): Param<K> {
  return {
    name,
    field,
    encode: (v) => pairs.find(([, value]) => value === v)?.[0] ?? "",
    decode: (raw) => pairs.find(([token]) => token === raw.toLowerCase())?.[1],
  };
}

// A comma list over a fixed vocabulary, written in vocabulary order.
// Unknown tokens are dropped; a list with only unknown tokens is invalid,
// while an empty value is an explicit empty set.
function setParam<K extends keyof ShareState, V>(
  name: string,
  field: K,
  pairs: ReadonlyArray<readonly [string, V]>,
  normalize: (raw: string) => string = (raw) => raw.toLowerCase(),
): Param<K> {
  return {
    name,
    field,
    encode: (v) =>
      pairs
        .filter(([, value]) => (v as ReadonlySet<V>).has(value))
        .map(([token]) => token)
        .join(","),
    decode: (raw) => {
      if (raw === "") return new Set() as never;
      const tokens = raw.split(",").map((t) => normalize(t.trim()));
      const values = pairs
        .filter(([token]) => tokens.includes(token))
        .map(([, v]) => v);
      return values.length === 0 ? undefined : (new Set(values) as never);
    },
  };
}

const VIEWS: ReadonlyArray<readonly [string, ViewId]> = [
  ["notes", "note-map"],
  ["scales", "scale-positions"],
  ["shapes", "chord-shapes"],
];

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

// Sharps are written "s" so links need no %23; "#" is still accepted.
export function encodeKey(key: string): string {
  return key === ALL_NOTES_KEY ? "all" : key.replace("#", "s");
}

export function decodeKey(raw: string): string | undefined {
  if (raw.toLowerCase() === "all") return ALL_NOTES_KEY;
  const letter = raw.charAt(0).toUpperCase();
  if (!LETTERS.includes(letter)) return undefined;
  const rest = raw.slice(1);
  if (rest === "") return letter;
  if (rest === "#" || rest.toLowerCase() === "s") {
    return letter === "E" || letter === "B" ? undefined : `${letter}#`;
  }
  if (rest === "b" || rest === "B") {
    return letter === "C" || letter === "F" ? undefined : `${letter}b`;
  }
  return undefined;
}

const TIER_TOKENS: ReadonlyArray<readonly [string, ChordTier]> = [
  ["d", "diatonic"],
  ["s", "secondary"],
  ["b", "borrowed"],
];

function encodeChord(chord: ChordRef | null): string {
  if (chord === null) return "none";
  const tier = TIER_TOKENS.find(([, t]) => t === chord.tier)![0];
  return `${tier}${chord.degree}`;
}

function decodeChord(raw: string): ChordRef | null | undefined {
  const lower = raw.toLowerCase();
  if (lower === "none") return null;
  const match = /^([dsb])([1-7])$/.exec(lower);
  if (!match) return undefined;
  const tier = TIER_TOKENS.find(([t]) => t === match[1])![1];
  return { tier, degree: Number(match[2]) };
}

function decodeFrets(raw: string): ShareState["frets"] | undefined {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return start < end && end <= MAX_FRET ? { start, end } : undefined;
}

const HIGHLIGHTS: ReadonlyArray<readonly [string, HighlightableRole]> = [
  ["r", "root"],
  ["3", "third"],
  ["5", "fifth"],
  ["7", "seventh"],
];

// String numbers count from the high E (1) as guitarists do; the app's
// indices count from the low E (0).
const STRINGS: ReadonlyArray<readonly [string, number]> = [1, 2, 3, 4, 5, 6].map(
  (n) => [String(n), 6 - n] as const,
);

const POSITIONS: ReadonlyArray<readonly [string, string]> = CAGED_POSITIONS.map(
  (p) => [p.shape.toLowerCase(), positionForShape(p.shape)] as const,
);

const STRING_SETS: ReadonlyArray<readonly [string, StringSet]> = [
  ["123", "1-2-3"],
  ["234", "2-3-4"],
  ["345", "3-4-5"],
  ["456", "4-5-6"],
];

const INVERSIONS: ReadonlyArray<readonly [string, Inversion]> = [
  ["root", "root"],
  ["first", "first"],
  ["second", "second"],
];

const SEVENTH_INVERSIONS: ReadonlyArray<readonly [string, SeventhInversion]> = [
  ...INVERSIONS,
  ["third", "third"],
];

const VOICINGS: ReadonlyArray<readonly [string, VoicingSystem]> = [
  ["close", "close"],
  ["drop2", "drop2"],
  ["drop3", "drop3"],
  ["drop24", "drop2-4"],
];

const BASS: ReadonlyArray<readonly [string, SeventhStringPosition]> = [
  ["low", "low"],
  ["mid", "mid"],
  ["high", "high"],
];

const CAGED_LETTERS: ReadonlyArray<readonly [string, CagedShape]> = (
  ["E", "A", "D", "C", "G"] as const
).map((s) => [s.toLowerCase(), s] as const);

const FLAG: ReadonlyArray<readonly [string, boolean]> = [["1", true]];

const KEY_PARAM: Param<"key"> = {
  name: "key",
  field: "key",
  encode: encodeKey,
  decode: decodeKey,
};

const CHORD_PARAM: Param<"chord"> = {
  name: "chord",
  field: "chord",
  encode: encodeChord,
  decode: decodeChord,
};

const FRETS_PARAM: Param<"frets"> = {
  name: "frets",
  field: "frets",
  encode: (f) => (f === null ? "" : `${f.start}-${f.end}`),
  decode: decodeFrets,
};

export const PARAMS: ReadonlyArray<Param<keyof ShareState>> = [
  enumParam("view", "view", VIEWS),
  KEY_PARAM,
  enumParam(
    "mode",
    "mode",
    MODES.map((m) => [m, m] as const),
  ),
  CHORD_PARAM,
  enumParam("set", "rowMode", [
    ["triads", "triads"],
    ["sevenths", "sevenths"],
  ]),
  setParam("hl", "highlights", HIGHLIGHTS),
  setParam("str", "strings", STRINGS),
  FRETS_PARAM,
  setParam("pos", "positions", POSITIONS),
  enumParam("pent", "scaleType", [["1", "pentatonic"]]),
  enumParam("ctx", "showContext", FLAG),
  setParam("inv", "inversions", INVERSIONS),
  setParam("ss", "stringSets", STRING_SETS),
  enumParam("voice", "voicing", VOICINGS),
  setParam("bass", "seventhPositions", BASS),
  setParam("inv7", "seventhInversions", SEVENTH_INVERSIONS),
  enumParam("style", "voicingStyle", [
    ["inversions", "inversions"],
    ["caged", "caged"],
  ]),
  setParam("caged", "cagedShapes", CAGED_LETTERS),
] as never;

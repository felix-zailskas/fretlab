import type { Mode } from "../theory/modes";
import { MODES } from "../theory/modes";
import {
  CAGED_POSITIONS,
  positionForShape,
  type CagedShape,
} from "../theory/positions";
import type { StringSet, VoicingSystem } from "../theory/chordShapes";
import type { ShareState } from "./shareState";

export type TopicKind = "scale" | "triad" | "voicing" | "caged";

// The fields a topic path pins. A param for any of these is ignored on that
// path; changing one leaves the topic.
export type TopicFixes = Partial<ShareState>;

export type TopicPath = {
  path: string;
  kind: TopicKind;
  fixes: TopicFixes;
  defaultKey: string;
};

const DIATONIC_I = { tier: "diatonic", degree: 1 } as const;

// Shape segments in path order: E-first, then the page for all five.
const SHAPE_SEGMENTS: ReadonlyArray<[string, CagedShape]> = CAGED_POSITIONS.map((p) => [
  `${p.shape.toLowerCase()}-shape`,
  p.shape,
]);

type ScaleDef = { slug: string; mode: Mode; pentatonic: boolean; defaultKey: string };

const SCALE_DEFAULT_KEYS: Record<Mode, string> = {
  ionian: "C",
  dorian: "A",
  phrygian: "E",
  lydian: "F",
  mixolydian: "G",
  aeolian: "A",
  locrian: "B",
};

export const SCALE_DEFS: readonly ScaleDef[] = [
  { slug: "minor-pentatonic", mode: "aeolian", pentatonic: true, defaultKey: "A" },
  { slug: "major-pentatonic", mode: "ionian", pentatonic: true, defaultKey: "G" },
  ...MODES.map((mode) => ({
    slug: mode,
    mode,
    pentatonic: false,
    defaultKey: SCALE_DEFAULT_KEYS[mode],
  })),
];

export const TRIAD_QUALITIES: ReadonlyArray<[string, Mode]> = [
  ["major", "ionian"],
  ["minor", "aeolian"],
  ["diminished", "locrian"],
];

const TRIAD_STRING_SETS: readonly StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];

export const VOICING_SEGMENTS: ReadonlyArray<[string, VoicingSystem]> = [
  ["close", "close"],
  ["drop-2", "drop2"],
  ["drop-3", "drop3"],
  ["drop-2-4", "drop2-4"],
];

export const SEVENTH_TYPES: ReadonlyArray<[string, Mode]> = [
  ["maj7", "ionian"],
  ["m7", "dorian"],
  ["7", "mixolydian"],
  ["m7b5", "locrian"],
];

const CAGED_QUALITIES: ReadonlyArray<[string, Mode]> = [
  ["major", "ionian"],
  ["minor", "aeolian"],
];

function buildTopics(): TopicPath[] {
  const topics: TopicPath[] = [];
  for (const scale of SCALE_DEFS) {
    const base: TopicFixes = {
      view: "scale-positions",
      mode: scale.mode,
      scaleType: scale.pentatonic ? "pentatonic" : "full",
    };
    for (const [segment, shape] of SHAPE_SEGMENTS) {
      topics.push({
        path: `/scales/${scale.slug}/${segment}`,
        kind: "scale",
        fixes: { ...base, positions: new Set([positionForShape(shape)]) },
        defaultKey: scale.defaultKey,
      });
    }
    topics.push({
      path: `/scales/${scale.slug}/all-shapes`,
      kind: "scale",
      fixes: { ...base, positions: new Set(CAGED_POSITIONS.map((p) => p.id)) },
      defaultKey: scale.defaultKey,
    });
  }
  const chordBase = (mode: Mode): TopicFixes => ({
    view: "chord-shapes",
    mode,
    chord: DIATONIC_I,
  });
  for (const [quality, mode] of TRIAD_QUALITIES) {
    for (const set of TRIAD_STRING_SETS) {
      topics.push({
        path: `/chords/triads/${quality}/strings-${set}`,
        kind: "triad",
        fixes: {
          ...chordBase(mode),
          rowMode: "triads",
          voicingStyle: "inversions",
          stringSets: new Set([set]),
        },
        defaultKey: "C",
      });
    }
  }
  for (const [segment, voicing] of VOICING_SEGMENTS) {
    for (const [type, mode] of SEVENTH_TYPES) {
      topics.push({
        path: `/chords/${segment}/${type}`,
        kind: "voicing",
        fixes: {
          ...chordBase(mode),
          rowMode: "sevenths",
          voicingStyle: "inversions",
          voicing,
        },
        defaultKey: "C",
      });
    }
  }
  for (const [quality, mode] of CAGED_QUALITIES) {
    for (const [segment, shape] of SHAPE_SEGMENTS) {
      topics.push({
        path: `/chords/caged/${quality}/${segment}`,
        kind: "caged",
        fixes: {
          ...chordBase(mode),
          rowMode: "triads",
          voicingStyle: "caged",
          cagedShapes: new Set([shape]),
        },
        defaultKey: "C",
      });
    }
  }
  return topics;
}

const TOPICS: readonly TopicPath[] = buildTopics();
const BY_PATH = new Map(TOPICS.map((t) => [t.path, t]));

export function allTopicPaths(): readonly TopicPath[] {
  return TOPICS;
}

export function normalizePath(pathname: string): string {
  const lower = pathname.toLowerCase().replace(/\/+$/, "");
  return lower === "" ? "/" : lower;
}

export function topicForPath(pathname: string): TopicPath | null {
  return BY_PATH.get(normalizePath(pathname)) ?? null;
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((v) => b.has(v));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a);
    return (
      ka.length === Object.keys(b).length &&
      ka.every((k) => sameValue((a as never)[k], (b as never)[k]))
    );
  }
  return a === b;
}

export function matchesTopic(state: ShareState, topic: TopicPath): boolean {
  return (Object.keys(topic.fixes) as (keyof ShareState)[]).every((k) =>
    sameValue(state[k], topic.fixes[k]),
  );
}

import { getModalScaleNotes, type Mode } from "../theory/modes";
import { PENTATONIC_DROPPED_DEGREES } from "../theory/pentatonic";
import {
  CAGED_POSITIONS,
  getScalePositionWindows,
  positionForShape,
  type CagedShape,
} from "../theory/positions";
import { QUALITY_INTERVALS } from "../theory/harmony";
import { spellChord, getNoteIndex, type SpelledNote } from "../theory/notes";
import { TUNINGS } from "../theory/tuning";
import {
  SCALE_DEFS,
  SEVENTH_TYPES,
  TRIAD_QUALITIES,
  VOICING_SEGMENTS,
  allTopicPaths,
  normalizePath,
  type TopicPath,
} from "../url/topicPaths";
import {
  BRAND,
  SCALE_NAMES,
  SEVENTH_NAMES,
  SHAPE_ROOTS,
  TRIAD_NAMES,
  VOICING_NAMES,
} from "./copy";

export type SearchPage = {
  path: string;
  title: string; // ≤ 60 characters
  description: string; // ≤ 160 characters
  heading: string; // the visible h1
  answer: (key: string) => string; // 1–2 sentences, facts from src/theory
  defaultKey: string;
  related: string[];
};

const SHAPE_ORDER: readonly CagedShape[] = CAGED_POSITIONS.map((p) => p.shape);

function withBrand(title: string): string {
  return title.length + BRAND.length <= 60 ? title + BRAND : title;
}

function cycle<T>(items: readonly T[], item: T, step: number): T {
  const i = items.indexOf(item);
  return items[(i + step + items.length) % items.length];
}

const segment = (shape: CagedShape) => `${shape.toLowerCase()}-shape`;
const positionNumber = (shape: CagedShape) => positionForShape(shape).slice(1);

// The fret of the tonic on the shape's anchor string inside its box.
function rootFret(key: string, mode: Mode, shape: CagedShape): number {
  const [low, high] = getScalePositionWindows(
    key,
    mode,
    positionForShape(shape),
    0,
    24,
    TUNINGS.standard,
  )[0];
  const open = TUNINGS.standard.strings[6 - SHAPE_ROOTS[shape].string];
  for (let fret = low; fret <= high; fret++) {
    if ((getNoteIndex(open) + fret) % 12 === getNoteIndex(key) % 12) return fret;
  }
  return low;
}

function scaleNotes(key: string, mode: Mode, pentatonic: boolean): string {
  const notes = getModalScaleNotes(key, mode);
  const dropped = pentatonic ? (PENTATONIC_DROPPED_DEGREES[mode] ?? []) : [];
  return notes.filter((_, i) => !dropped.includes(i)).join(" ");
}

function chordNotes(key: string, quality: keyof typeof QUALITY_INTERVALS): string {
  return spellChord(key as SpelledNote, QUALITY_INTERVALS[quality]).join(" ");
}

const scalePath = (slug: string, seg: string) => `/scales/${slug}/${seg}`;

// Scales paired by sound: each pentatonic with its 7-note parent.
const SCALE_PAIRS: Record<string, string> = {
  "minor-pentatonic": "aeolian",
  aeolian: "minor-pentatonic",
  "major-pentatonic": "ionian",
  ionian: "major-pentatonic",
};

function scalePage(topic: TopicPath, slug: string, seg: string): SearchPage {
  const def = SCALE_DEFS.find((d) => d.slug === slug)!;
  const name = SCALE_NAMES[slug];
  const unit = name.isBox ? "box" : "position";
  const slugs = SCALE_DEFS.map((d) => d.slug);
  const pair = SCALE_PAIRS[slug];

  if (seg === "all-shapes") {
    return {
      path: topic.path,
      title: withBrand(`${name.title}: All 5 Shapes on Guitar`),
      description: `All five ${name.text} shapes on guitar, E, D, C, A and G, connected up the neck. Interactive fretboard with roots and intervals in any key. Free.`,
      heading: `${name.title}: all 5 shapes`,
      answer: (key) =>
        `The five ${name.text} shapes, ${unit === "box" ? "boxes" : "positions"} 1 to 5 (E, D, C, A, G), join into one map of the neck. In ${key} the E shape starts with the root on the 6th string at fret ${rootFret(key, def.mode, "E")}. Notes: ${scaleNotes(key, def.mode, def.pentatonic)}.`,
      defaultKey: topic.defaultKey,
      related: [
        ...new Set([
          scalePath(slug, "e-shape"),
          scalePath(cycle(slugs, slug, 1), "all-shapes"),
          scalePath(cycle(slugs, slug, -1), "all-shapes"),
          ...(pair ? [scalePath(pair, "all-shapes")] : []),
        ]),
      ],
    };
  }

  const shape = seg.charAt(0).toUpperCase() as CagedShape;
  const n = positionNumber(shape);
  const label = name.isBox ? `Box ${n}` : `Position ${n}`;
  const related = [
    scalePath(slug, segment(cycle(SHAPE_ORDER, shape, 1))),
    scalePath(slug, segment(cycle(SHAPE_ORDER, shape, -1))),
    scalePath(slug, "all-shapes"),
  ];
  if (pair) related.push(scalePath(pair, seg));
  if (slug === "ionian" || slug === "aeolian") {
    related.push(`/chords/caged/${slug === "ionian" ? "major" : "minor"}/${seg}`);
  }
  return {
    path: topic.path,
    title: withBrand(`${name.title} ${shape} Shape (${label}) on Guitar`),
    description: `The ${name.text} ${shape} shape (${label.toLowerCase()}) on guitar: ${SHAPE_ROOTS[shape].text}. Interactive fretboard with intervals, any key.`,
    heading: `${name.title.replace(/ Mode$/, "")} ${shape} shape (${label.toLowerCase()})`,
    answer: (key) =>
      `The ${shape} shape is ${unit} ${n} of the ${name.text}, with the ${SHAPE_ROOTS[shape].text}. In ${key} the root is on the ${SHAPE_ROOTS[shape].string}th string at fret ${rootFret(key, def.mode, shape)}; notes: ${scaleNotes(key, def.mode, def.pentatonic)}.`,
    defaultKey: topic.defaultKey,
    related,
  };
}

const TRIAD_QUALITY_KEYS = { major: "maj", minor: "min", diminished: "dim" } as const;
const TRIAD_TO_SEVENTH = { major: "maj7", minor: "m7", diminished: "m7b5" } as const;
const SEVENTH_TO_TRIAD: Record<string, string> = {
  maj7: "major",
  "7": "major",
  m7: "minor",
  m7b5: "diminished",
};
const TRIAD_SETS = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
const triadPath = (q: string, set: string) => `/chords/triads/${q}/strings-${set}`;

function triadPage(topic: TopicPath, quality: string, set: string): SearchPage {
  const name = TRIAD_NAMES[quality];
  const qualities = TRIAD_QUALITIES.map(([q]) => q);
  const cagedQuality = quality === "major" ? "major" : "minor";
  return {
    path: topic.path,
    title: withBrand(`${name} Triads on Strings ${set}: All Inversions`),
    description: `${name} triads on guitar strings ${set}: root position, 1st and 2nd inversion with roots, 3rds and 5ths marked. Interactive, in any key, free.`,
    heading: `${name} triads on strings ${set}`,
    answer: (key) =>
      `The ${key} ${quality} triad is ${chordNotes(key, TRIAD_QUALITY_KEYS[quality as keyof typeof TRIAD_QUALITY_KEYS])}. On strings ${set} it has three grips, root position, 1st and 2nd inversion, each with the root in a different voice.`,
    defaultKey: topic.defaultKey,
    related: [
      triadPath(quality, cycle(TRIAD_SETS, set, 1)),
      triadPath(quality, cycle(TRIAD_SETS, set, -1)),
      triadPath(cycle(qualities, quality, 1), set),
      `/chords/caged/${cagedQuality}/e-shape`,
      `/chords/drop-2/${TRIAD_TO_SEVENTH[quality as keyof typeof TRIAD_TO_SEVENTH]}`,
    ],
  };
}

function voicingPage(topic: TopicPath, seg: string, type: string): SearchPage {
  const voicing = VOICING_SEGMENTS.find(([s]) => s === seg)![1];
  const v = VOICING_NAMES[voicing];
  const t = SEVENTH_NAMES[type];
  const segs = VOICING_SEGMENTS.map(([s]) => s);
  const types = SEVENTH_TYPES.map(([s]) => s);
  return {
    path: topic.path,
    title: withBrand(`${v.title} ${t.title} Voicings on Guitar`),
    description: `${v.title} ${t.text} chord voicings on guitar, every inversion with root, 3rd, 5th and 7th marked. Interactive fretboard in any key. Free.`,
    heading: `${v.title} ${t.title} voicings`,
    answer: (key) =>
      `${key}${type === "7" ? "7" : type} is ${chordNotes(key, type as keyof typeof QUALITY_INTERVALS)}. ${v.how.charAt(0).toUpperCase()}${v.how.slice(1)}.`,
    defaultKey: topic.defaultKey,
    related: [
      `/chords/${cycle(segs, seg, 1)}/${type}`,
      `/chords/${cycle(segs, seg, -1)}/${type}`,
      `/chords/${seg}/${cycle(types, type, 1)}`,
      triadPath(SEVENTH_TO_TRIAD[type], "2-3-4"),
    ],
  };
}

function cagedPage(topic: TopicPath, quality: string, seg: string): SearchPage {
  const shape = seg.charAt(0).toUpperCase() as CagedShape;
  const name = TRIAD_NAMES[quality];
  const other = quality === "major" ? "minor" : "major";
  return {
    path: topic.path,
    title: withBrand(`${name} Chord ${shape} Shape (CAGED) on Guitar`),
    description: `The ${quality} chord ${shape} shape from the CAGED system on guitar, moved up the neck to any key, with root, 3rd and 5th marked. Interactive and free.`,
    heading: `${name} chord, ${shape} shape (CAGED)`,
    answer: (key) =>
      `The ${shape} shape is the open ${shape} ${quality} chord moved up the neck, matching scale position ${positionNumber(shape)}. ${key} ${quality} is ${chordNotes(key, quality === "major" ? "maj" : "min")}.`,
    defaultKey: topic.defaultKey,
    related: [
      `/chords/caged/${quality}/${segment(cycle(SHAPE_ORDER, shape, 1))}`,
      `/chords/caged/${quality}/${segment(cycle(SHAPE_ORDER, shape, -1))}`,
      `/chords/caged/${other}/${seg}`,
      scalePath(quality === "major" ? "ionian" : "aeolian", seg),
      triadPath(quality, "1-2-3"),
    ],
  };
}

function buildPage(topic: TopicPath): SearchPage {
  const parts = topic.path.split("/").filter(Boolean);
  switch (topic.kind) {
    case "scale":
      return scalePage(topic, parts[1], parts[2]);
    case "triad":
      return triadPage(topic, parts[2], parts[3].replace("strings-", ""));
    case "voicing":
      return voicingPage(topic, parts[1], parts[2]);
    case "caged":
      return cagedPage(topic, parts[2], parts[3]);
  }
}

export const SEARCH_PAGES: readonly SearchPage[] = allTopicPaths().map(buildPage);

const BY_PATH = new Map(SEARCH_PAGES.map((p) => [p.path, p]));

export function findPage(pathname: string): SearchPage | null {
  return BY_PATH.get(normalizePath(pathname)) ?? null;
}

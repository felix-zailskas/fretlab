import { describe, it, expect } from "vitest";
import { parseUrl } from "./parseUrl";
import { serializeUrl } from "./serializeUrl";
import { DEFAULT_SHARE_STATE, accidentalForKey, type ShareState } from "./shareState";
import { allTopicPaths, matchesTopic, topicForPath } from "./topicPaths";
import { MODES } from "../theory/modes";
import { CAGED_POSITIONS, type CagedShape } from "../theory/positions";
import { VOICING_SYSTEM_ORDER, type StringSet } from "../theory/chordShapes";

const ORIGIN = "https://fretlab.studio";
const parse = (href: string) => parseUrl(new URL(href, ORIGIN));
const roundTrip = (s: ShareState, path = "/") => {
  const { topic } = parse(path);
  return parse(serializeUrl(s, topic)).state;
};

const KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "all",
];
const STRING_SETS: StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
const CAGED_LETTERS: CagedShape[] = ["E", "A", "D", "C", "G"];

describe("URL contract v1 — round trip", () => {
  it("defaults serialize to a bare /", () => {
    expect(serializeUrl(DEFAULT_SHARE_STATE, null)).toBe("/");
    expect(parse("/").state).toEqual(DEFAULT_SHARE_STATE);
  });

  it("round-trips every key in every mode", () => {
    for (const key of KEYS) {
      for (const mode of MODES) {
        const s = { ...DEFAULT_SHARE_STATE, key, mode };
        expect(roundTrip(s), `${key} ${mode}`).toEqual(s);
      }
    }
  });

  it("round-trips every view, position subset of one and two, voicing, string set and CAGED shape", () => {
    const states: ShareState[] = [];
    for (const view of ["note-map", "scale-positions", "chord-shapes"] as const)
      states.push({ ...DEFAULT_SHARE_STATE, view });
    for (const a of CAGED_POSITIONS)
      for (const b of CAGED_POSITIONS)
        states.push({ ...DEFAULT_SHARE_STATE, positions: new Set([a.id, b.id]) });
    for (const voicing of VOICING_SYSTEM_ORDER)
      states.push({ ...DEFAULT_SHARE_STATE, voicing });
    for (const ss of STRING_SETS)
      states.push({ ...DEFAULT_SHARE_STATE, stringSets: new Set([ss]) });
    for (const c of CAGED_LETTERS)
      states.push({
        ...DEFAULT_SHARE_STATE,
        voicingStyle: "caged",
        cagedShapes: new Set([c]),
      });
    states.push({
      ...DEFAULT_SHARE_STATE,
      chord: { tier: "secondary", degree: 5 },
      rowMode: "sevenths",
      highlights: new Set(["root", "third"]),
      strings: new Set([0, 1, 2, 3]),
      frets: { start: 3, end: 10 },
      scaleType: "pentatonic",
      showContext: true,
      inversions: new Set(["first"]),
      seventhPositions: new Set(["mid", "high"]),
      seventhInversions: new Set(["root", "third"]),
    });
    states.push({ ...DEFAULT_SHARE_STATE, chord: null });
    for (const s of states) expect(roundTrip(s)).toEqual(s);
  });
});

describe("URL contract v1 — golden URLs (append only)", () => {
  it("/?view=scales&key=A&mode=dorian&pos=E,D&hl=r,3&frets=3-10", () => {
    const { state, topic } = parse(
      "/?view=scales&key=A&mode=dorian&pos=E,D&hl=r,3&frets=3-10",
    );
    expect(topic).toBeNull();
    expect(state).toEqual({
      ...DEFAULT_SHARE_STATE,
      view: "scale-positions",
      key: "A",
      mode: "dorian",
      positions: new Set(["P1", "P2"]),
      highlights: new Set(["root", "third"]),
      frets: { start: 3, end: 10 },
    });
  });

  it("/scales/minor-pentatonic/e-shape", () => {
    const { state, topic } = parse("/scales/minor-pentatonic/e-shape");
    expect(topic?.path).toBe("/scales/minor-pentatonic/e-shape");
    expect(state.view).toBe("scale-positions");
    expect(state.mode).toBe("aeolian");
    expect(state.scaleType).toBe("pentatonic");
    expect(state.positions).toEqual(new Set(["P1"]));
    expect(state.key).toBe("A");
  });

  it("/scales/minor-pentatonic/e-shape?key=Fs keeps the topic in F#", () => {
    const { state, topic } = parse("/scales/minor-pentatonic/e-shape?key=Fs");
    expect(topic).not.toBeNull();
    expect(state.key).toBe("F#");
  });

  it("?key=C%23, ?key=Db and ?key=all", () => {
    expect(parse("/?key=C%23").state.key).toBe("C#");
    expect(parse("/?key=Db").state.key).toBe("Db");
    expect(parse("/?key=all").state.key).toBe("all");
  });

  it("/chords/drop-2/m7?key=D", () => {
    const { state } = parse("/chords/drop-2/m7?key=D");
    expect(state).toMatchObject({
      view: "chord-shapes",
      key: "D",
      mode: "dorian",
      rowMode: "sevenths",
      voicing: "drop2",
      voicingStyle: "inversions",
      chord: { tier: "diatonic", degree: 1 },
    });
  });

  it("/chords/triads/minor/strings-2-3-4 and /chords/caged/major/a-shape", () => {
    expect(parse("/chords/triads/minor/strings-2-3-4").state).toMatchObject({
      view: "chord-shapes",
      rowMode: "triads",
      mode: "aeolian",
      stringSets: new Set(["2-3-4"]),
    });
    expect(parse("/chords/caged/major/a-shape").state).toMatchObject({
      view: "chord-shapes",
      voicingStyle: "caged",
      cagedShapes: new Set(["A"]),
      mode: "ionian",
    });
  });
});

describe("URL contract v1 — robustness", () => {
  it("ignores unknown params and falls back per field on garbage", () => {
    const { state } = parse(
      "/?utm_source=yt&ref=x&key=H&mode=funk&frets=20-3&pos=X,E,E&hl=&view=nope&chord=q9&str=0,7",
    );
    expect(state).toEqual({
      ...DEFAULT_SHARE_STATE,
      positions: new Set(["P1"]),
      highlights: new Set(),
    });
  });

  it("accepts lists in any order and lowercase keys and shapes", () => {
    expect(parse("/?pos=d,e&key=bb").state).toMatchObject({
      positions: new Set(["P1", "P2"]),
      key: "Bb",
    });
  });

  it("drops pentatonic where the mode has none", () => {
    expect(parse("/?mode=dorian&pent=1").state.scaleType).toBe("full");
  });

  it("resolves topic paths case-insensitively with a trailing slash", () => {
    expect(topicForPath("/Scales/Minor-Pentatonic/E-Shape/")?.path).toBe(
      "/scales/minor-pentatonic/e-shape",
    );
    expect(topicForPath("/scales/minor-pentatonic/h-shape")).toBeNull();
  });
});

describe("URL contract v1 — topic paths", () => {
  it("has 92 unique topic paths", () => {
    const paths = allTopicPaths().map((t) => t.path);
    expect(paths).toHaveLength(92);
    expect(new Set(paths).size).toBe(92);
  });

  it("every topic path parses to a state that matches its topic", () => {
    for (const t of allTopicPaths()) {
      const { state, topic } = parse(t.path);
      expect(topic?.path).toBe(t.path);
      expect(matchesTopic(state, t), t.path).toBe(true);
      expect(serializeUrl(state, t)).toBe(t.path);
    }
  });

  it("keeps the path when the key changes and drops it when a fixed field changes", () => {
    const { state, topic } = parse("/scales/minor-pentatonic/e-shape");
    expect(serializeUrl({ ...state, key: "E" }, topic)).toBe(
      "/scales/minor-pentatonic/e-shape?key=E",
    );
    const left = serializeUrl({ ...state, mode: "dorian", scaleType: "full" }, topic);
    expect(left.startsWith("/?")).toBe(true);
    expect(parse(left).state).toEqual({ ...state, mode: "dorian", scaleType: "full" });
  });
});

describe("accidentalForKey", () => {
  it("follows the key's spelling, else the key's natural preference", () => {
    expect(accidentalForKey("Db", "ionian")).toBe("flat");
    expect(accidentalForKey("C#", "ionian")).toBe("sharp");
    expect(accidentalForKey("F", "ionian")).toBe("flat");
    expect(accidentalForKey("C", "ionian")).toBe("sharp");
  });
});

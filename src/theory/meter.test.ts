import { describe, it, expect } from "vitest";
import {
  TIME_SIGNATURE_PRESETS,
  accentPattern,
  allowedSlotLengths,
  beatsInWindow,
  beatsPerSlot,
  buildTimeline,
  locate,
  playbackTimeline,
  secondsPerBeat,
  snapSlotLength,
  timeSignatureLabel,
  type Accent,
  type TimeSignature,
} from "./meter";

const sig = (beats: number, unit: TimeSignature["unit"]): TimeSignature => ({
  beats,
  unit,
});
const FOUR_FOUR = sig(4, 4);
const short = (a: Accent): string =>
  a === "strong" ? "S" : a === "medium" ? "M" : "w";
const PRESET_CASES = TIME_SIGNATURE_PRESETS.map(
  (p) => [timeSignatureLabel(p), p] as const,
);

describe("TIME_SIGNATURE_PRESETS", () => {
  it("has unique labels (they are the <select> values)", () => {
    const labels = TIME_SIGNATURE_PRESETS.map(timeSignatureLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("labels as beats/unit", () => {
    expect(timeSignatureLabel(sig(6, 8))).toBe("6/8");
  });
});

describe.each(PRESET_CASES)("accentPattern(%s)", (_label, preset) => {
  it("has one accent per beat", () => {
    expect(accentPattern(preset)).toHaveLength(preset.beats);
  });

  it("starts on a strong beat", () => {
    expect(accentPattern(preset)[0]).toBe("strong");
  });

  it("has exactly one strong beat", () => {
    expect(accentPattern(preset).filter((a) => a === "strong")).toHaveLength(1);
  });
});

describe("accentPattern examples", () => {
  it.each([
    ["2/4", sig(2, 4), "S w"],
    ["3/4", sig(3, 4), "S w w"],
    ["4/4", sig(4, 4), "S w w w"],
    ["5/4 (3+2)", sig(5, 4), "S w w M w"],
    ["6/8", sig(6, 8), "S w w M w w"],
    ["7/8 (2+2+3)", sig(7, 8), "S w M w M w w"],
    ["9/8", sig(9, 8), "S w w M w w M w w"],
    ["12/8", sig(12, 8), "S w w M w w M w w M w w"],
    ["6/4 is not compound", sig(6, 4), "S w w w w w"],
  ])("%s", (_label, s, expected) => {
    expect(accentPattern(s).map(short).join(" ")).toBe(expected);
  });
});

describe.each(PRESET_CASES)("allowedSlotLengths(%s)", (_label, preset) => {
  it("only offers whole numbers of beats", () => {
    for (const bars of allowedSlotLengths(preset)) {
      expect(Number.isInteger(beatsPerSlot(bars, preset))).toBe(true);
    }
  });

  it("offers ½ bar exactly when the bar splits evenly", () => {
    expect(allowedSlotLengths(preset).includes(0.5)).toBe(preset.beats % 2 === 0);
  });

  it("snaps a disallowed length to 1", () => {
    expect(snapSlotLength(0.75, preset)).toBe(1);
  });

  it("keeps an allowed length", () => {
    for (const bars of allowedSlotLengths(preset)) {
      expect(snapSlotLength(bars, preset)).toBe(bars);
    }
  });
});

describe("allowedSlotLengths values", () => {
  it("even meters", () => {
    expect(allowedSlotLengths(sig(4, 4))).toEqual([0.5, 1, 2, 3, 4]);
  });

  it("odd meters", () => {
    expect(allowedSlotLengths(sig(3, 4))).toEqual([1, 2, 3, 4]);
  });
});

describe("buildTimeline", () => {
  it("accumulates slot starts in beats", () => {
    expect(buildTimeline([1, 0.5, 2], FOUR_FOUR)).toEqual({
      starts: [0, 4, 6],
      totalBeats: 14,
    });
  });

  it("is empty for no slots", () => {
    expect(buildTimeline([], FOUR_FOUR)).toEqual({ starts: [], totalBeats: 0 });
  });
});

describe("playbackTimeline", () => {
  it("matches buildTimeline when there are slots", () => {
    expect(playbackTimeline([1, 0.5, 2], FOUR_FOUR)).toEqual(
      buildTimeline([1, 0.5, 2], FOUR_FOUR),
    );
  });

  it.each(PRESET_CASES)("is one bar of %s when there are no slots", (_l, preset) => {
    expect(playbackTimeline([], preset)).toEqual({
      starts: [0],
      totalBeats: preset.beats,
    });
  });
});

describe("locate", () => {
  const timeline = buildTimeline([1, 0.5, 2], FOUR_FOUR); // starts 0, 4, 6; total 14

  it.each([
    [0, 0, 0],
    [3, 0, 3],
    [4, 1, 0],
    [5, 1, 1],
    [6, 2, 2],
    [13, 2, 1],
  ])("beat %i → slot %i, beatInBar %i", (beat, slotIndex, beatInBar) => {
    expect(locate(beat, timeline, FOUR_FOUR)).toEqual({ slotIndex, beatInBar });
  });

  it("wraps past the end (loop)", () => {
    expect(locate(14, timeline, FOUR_FOUR)).toEqual({
      slotIndex: 0,
      beatInBar: 0,
    });
  });

  it("wraps more than once", () => {
    expect(locate(14 + 14 + 4, timeline, FOUR_FOUR)).toEqual({
      slotIndex: 1,
      beatInBar: 0,
    });
  });

  it("throws on an empty timeline", () => {
    expect(() => locate(0, buildTimeline([], FOUR_FOUR), FOUR_FOUR)).toThrow(
      RangeError,
    );
  });
});

describe("secondsPerBeat", () => {
  it("120 BPM is half a second", () => {
    expect(secondsPerBeat(120)).toBe(0.5);
  });
});

describe("beatsInWindow", () => {
  it("includes a beat exactly at the window start", () => {
    expect(beatsInWindow(1, 3, 0, 60)).toEqual([1, 2]);
  });

  it("excludes a beat exactly at the window end", () => {
    expect(beatsInWindow(0, 3, 0, 60)).toEqual([0, 1, 2]);
  });

  it("returns nothing for a window between beats", () => {
    expect(beatsInWindow(0.1, 0.9, 0, 60)).toEqual([]);
  });

  it("never returns negative beats for a window before the start", () => {
    expect(beatsInWindow(-1, 0.5, 0, 60)).toEqual([0]);
  });

  it("honours a non-zero start time", () => {
    expect(beatsInWindow(10, 11, 10.25, 120)).toEqual([0, 1]);
  });

  it("is robust to floating-point beat times", () => {
    const beat2 = 2 * secondsPerBeat(90);
    expect(beatsInWindow(beat2, beat2 + 0.1, 0, 90)).toEqual([2]);
  });
});

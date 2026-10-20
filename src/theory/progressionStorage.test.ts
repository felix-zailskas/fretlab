// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BPM_MAX,
  BPM_MIN,
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  clampBpm,
  loadProgression,
  saveProgression,
  type ProgressionSlot,
  type StoredProgression,
} from "./progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "./meter";

const F: ProgressionSlot = {
  id: "slot:1-a",
  ref: { tier: "diatonic", degree: 4 },
  bars: 2,
};
const A7: ProgressionSlot = {
  id: "slot:2-b",
  ref: { tier: "secondary", degree: 2 },
  bars: 0.5,
};

const SAMPLE: StoredProgression = {
  version: 1,
  slots: [F, A7],
  timeSignature: { beats: 4, unit: 4 },
  bpm: 120,
  click: true,
  loop: false,
  visible: false,
};

function prime(value: unknown) {
  localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(value));
}

describe("progressionStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the documented defaults when storage is empty", () => {
    expect(loadProgression()).toEqual({
      version: 1,
      slots: [],
      timeSignature: { beats: 4, unit: 4 },
      bpm: 90,
      click: false,
      loop: true,
      visible: true,
    });
  });

  it("round-trips a saved progression", () => {
    saveProgression(SAMPLE);
    expect(loadProgression()).toEqual(SAMPLE);
  });

  it("returns defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, "{not json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
    spy.mockRestore();
  });

  it("returns defaults when the version is missing", () => {
    prime({ ...SAMPLE, version: undefined }); // JSON.stringify drops it
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it("returns defaults for an unknown version", () => {
    prime({ ...SAMPLE, version: 2 });
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it.each([
    ["slots is not an array", { slots: {} }],
    ["unknown tier", { slots: [{ ...F, ref: { tier: "modal", degree: 1 } }] }],
    ["degree 0", { slots: [{ ...F, ref: { tier: "diatonic", degree: 0 } }] }],
    ["degree 8", { slots: [{ ...F, ref: { tier: "diatonic", degree: 8 } }] }],
    [
      "non-integer degree",
      { slots: [{ ...F, ref: { tier: "diatonic", degree: 2.5 } }] },
    ],
    ["empty slot id", { slots: [{ ...F, id: "" }] }],
    ["bars is a string", { slots: [{ ...F, bars: "2" }] }],
    ["duplicate slot ids", { slots: [F, { ...F }] }],
    ["unknown time signature", { timeSignature: { beats: 4, unit: 3 } }],
    ["bpm is not a number", { bpm: "fast" }],
    ["click is not a boolean", { click: "yes" }],
    ["loop is missing", { loop: undefined }],
    ["visible is null", { visible: null }],
  ])("returns defaults when %s", (_label, patch) => {
    prime({ ...SAMPLE, ...patch });
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it("clamps a stored BPM below the minimum", () => {
    prime({ ...SAMPLE, bpm: 5 });
    expect(loadProgression().bpm).toBe(BPM_MIN);
  });

  it("clamps a stored BPM above the maximum", () => {
    prime({ ...SAMPLE, bpm: 1000 });
    expect(loadProgression().bpm).toBe(BPM_MAX);
  });

  it("swallows storage write errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveProgression(SAMPLE)).not.toThrow();
    set.mockRestore();
    warn.mockRestore();
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "loading under %s",
  (_label, preset) => {
    beforeEach(() => {
      localStorage.clear();
      prime({
        ...SAMPLE,
        timeSignature: preset,
        slots: [
          { ...F, id: "a", bars: 0.75 },
          { ...F, id: "b", bars: 0.5 },
        ],
      });
    });

    it("snaps every slot to an allowed length", () => {
      const allowed = allowedSlotLengths(preset);
      for (const slot of loadProgression().slots) {
        expect(allowed).toContain(slot.bars);
      }
    });

    it("snaps a disallowed length to 1", () => {
      expect(loadProgression().slots[0].bars).toBe(1);
    });
  },
);

describe("clampBpm", () => {
  it.each([
    [5, 30],
    [30, 30],
    [87.6, 88],
    [300, 300],
    [301, 300],
  ])("%d → %d", (input, expected) => {
    expect(clampBpm(input)).toBe(expected);
  });
});

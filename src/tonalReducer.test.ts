import { describe, it, expect } from "vitest";
import { tonalReducer, type TonalState } from "./tonalReducer";

const sharp: TonalState = { key: "C", mode: "ionian", accidentalStyle: "sharp" };
const flat: TonalState = { key: "F", mode: "ionian", accidentalStyle: "flat" };

describe("set-key", () => {
  it("basic: sets key, preserves mode and style when natural matches", () => {
    // G major is a sharp key; current style is sharp — no conflict
    const result = tonalReducer(sharp, { type: "set-key", key: "G" });
    expect(result).toEqual({ key: "G", mode: "ionian", accidentalStyle: "sharp" });
  });

  it("neutral parent (C major): preserves current accidental style", () => {
    // C major has no accidentals — natural is null, style must not change
    const state: TonalState = { key: "G", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-key", key: "C" });
    expect(result).toEqual({ key: "C", mode: "ionian", accidentalStyle: "sharp" });
  });

  it("auto-sets flat style and swaps A# → Bb when A# ionian is clicked in sharp mode", () => {
    // A#/Bb major prefers flat (Bb = 2 flats). Clicking A# in sharp mode
    // switches style to flat and swaps the key to Bb so it stays visible in
    // the flat-style KeySelector list.
    const result = tonalReducer(sharp, { type: "set-key", key: "A#" });
    expect(result).toEqual({ key: "Bb", mode: "ionian", accidentalStyle: "flat" });
  });

  it("auto-sets sharp style and keeps key when sharp key is clicked in flat mode", () => {
    // E major prefers sharp. Clicking E in flat mode switches style to sharp.
    // E has no enharmonic, so no swap.
    const result = tonalReducer(flat, { type: "set-key", key: "E" });
    expect(result).toEqual({ key: "E", mode: "ionian", accidentalStyle: "sharp" });
  });

  it("no swap when selected key already matches current style", () => {
    // F major prefers flat; clicking F in flat mode — styles match, no swap
    const state: TonalState = { key: "C", mode: "ionian", accidentalStyle: "flat" };
    const result = tonalReducer(state, { type: "set-key", key: "F" });
    expect(result).toEqual({ key: "F", mode: "ionian", accidentalStyle: "flat" });
  });
});

describe("set-mode", () => {
  it("basic: sets mode, preserves key and style when natural matches", () => {
    // E Dorian's parent is D major (sharp). Current style is sharp — no conflict.
    const state: TonalState = { key: "E", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-mode", mode: "dorian" });
    expect(result).toEqual({ key: "E", mode: "dorian", accidentalStyle: "sharp" });
  });

  it("neutral parent: switching to D Dorian (parent = C major) preserves style", () => {
    // D Dorian's parent major is C (no accidentals → null → style unchanged)
    const state: TonalState = { key: "D", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-mode", mode: "dorian" });
    expect(result).toEqual({ key: "D", mode: "dorian", accidentalStyle: "sharp" });
  });

  it("auto-sets flat style when mode change implies flat parent", () => {
    // G Dorian's parent is F major (flat). Current style is sharp → conflict.
    // G has no enharmonic, so no key swap.
    const state: TonalState = { key: "G", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-mode", mode: "dorian" });
    expect(result).toEqual({ key: "G", mode: "dorian", accidentalStyle: "flat" });
  });

  it("auto-sets sharp style and swaps Db → C# when mode change implies sharp parent", () => {
    // Db Phrygian's parent is A major (sharp: 3 sharps). Current style is flat → conflict.
    // ENHARMONIC_KEY_SWAP["Db"] = "C#" so key is swapped to keep it visible in sharp list.
    const state: TonalState = { key: "Db", mode: "ionian", accidentalStyle: "flat" };
    const result = tonalReducer(state, { type: "set-mode", mode: "phrygian" });
    expect(result).toEqual({ key: "C#", mode: "phrygian", accidentalStyle: "sharp" });
  });
});

describe("set-accidental", () => {
  it("no-op when style already matches", () => {
    // If the requested style equals current, return the same state reference
    const result = tonalReducer(sharp, { type: "set-accidental", style: "sharp" });
    expect(result).toBe(sharp);
  });

  it("swaps Bb → A# when switching flat → sharp", () => {
    const state: TonalState = { key: "Bb", mode: "ionian", accidentalStyle: "flat" };
    const result = tonalReducer(state, { type: "set-accidental", style: "sharp" });
    expect(result).toEqual({ key: "A#", mode: "ionian", accidentalStyle: "sharp" });
  });

  it("swaps A# → Bb when switching sharp → flat", () => {
    const state: TonalState = { key: "A#", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-accidental", style: "flat" });
    expect(result).toEqual({ key: "Bb", mode: "ionian", accidentalStyle: "flat" });
  });

  it("keeps key unchanged when key has no enharmonic (e.g. G)", () => {
    const state: TonalState = { key: "G", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-accidental", style: "flat" });
    expect(result).toEqual({ key: "G", mode: "ionian", accidentalStyle: "flat" });
  });

  it("swaps C# → Db when switching sharp → flat", () => {
    const state: TonalState = { key: "C#", mode: "ionian", accidentalStyle: "sharp" };
    const result = tonalReducer(state, { type: "set-accidental", style: "flat" });
    expect(result).toEqual({ key: "Db", mode: "ionian", accidentalStyle: "flat" });
  });
});

describe("TonalAction exhaustiveness", () => {
  it("handles all three action types without throwing", () => {
    // TypeScript enforces exhaustiveness at compile time (no default branch).
    // This test verifies all three arms execute at runtime.
    expect(() => tonalReducer(sharp, { type: "set-key", key: "D" })).not.toThrow();
    expect(() =>
      tonalReducer(sharp, { type: "set-mode", mode: "dorian" }),
    ).not.toThrow();
    expect(() =>
      tonalReducer(sharp, { type: "set-accidental", style: "flat" }),
    ).not.toThrow();
  });
});

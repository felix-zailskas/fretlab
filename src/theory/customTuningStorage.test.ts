// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadCustomTunings,
  saveCustomTunings,
  STORAGE_KEY,
  type StoredState,
} from "./customTuningStorage";
import type { CustomTuning } from "./tuning";

const SAMPLE: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("customTuningStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    const state = loadCustomTunings();
    expect(state).toEqual({
      version: 1,
      tunings: [],
      selectedTuningId: null,
    });
  });

  it("round-trips a saved state", () => {
    const original: StoredState = {
      version: 1,
      tunings: [SAMPLE],
      selectedTuningId: SAMPLE.id,
    };
    saveCustomTunings(original);
    const restored = loadCustomTunings();
    expect(restored).toEqual(original);
  });

  it("returns defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => loadCustomTunings()).not.toThrow();
    expect(loadCustomTunings().tunings).toEqual([]);
    spy.mockRestore();
  });

  it("returns defaults when version is missing or wrong", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tunings: [SAMPLE], selectedTuningId: null }),
    );
    expect(loadCustomTunings().tunings).toEqual([]);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, tunings: [SAMPLE], selectedTuningId: null }),
    );
    expect(loadCustomTunings().tunings).toEqual([]);
  });

  it("clears selectedTuningId if it points at a non-existent custom id", () => {
    saveCustomTunings({
      version: 1,
      tunings: [],
      selectedTuningId: "custom:does-not-exist",
    });
    const restored = loadCustomTunings();
    expect(restored.selectedTuningId).toBe("standard");
  });

  it("preserves a preset selectedTuningId across reload", () => {
    saveCustomTunings({
      version: 1,
      tunings: [],
      selectedTuningId: "dadgad",
    });
    expect(loadCustomTunings().selectedTuningId).toBe("dadgad");
  });
});

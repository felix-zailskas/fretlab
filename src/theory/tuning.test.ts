import { describe, it, expect } from "vitest";
import { TUNINGS, VIEWS_BY_TUNING, tuningSupportsView, type TuningId } from "./tuning";
import type { ViewId } from "../views/types";

const ALL_TUNING_IDS: TuningId[] = ["standard", "open-g"];
const ALL_VIEW_IDS: ViewId[] = ["note-map", "scale-positions", "chord-shapes"];

describe("TUNINGS registry", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id]).toBeDefined();
      expect(TUNINGS[id].id).toBe(id);
    }
  });

  it("standard tuning is E A D G B E (low → high)", () => {
    expect(TUNINGS.standard.strings).toEqual(["E", "A", "D", "G", "B", "E"]);
  });

  it("open-g tuning is D G D G B D (low → high)", () => {
    expect(TUNINGS["open-g"].strings).toEqual(["D", "G", "D", "G", "B", "D"]);
  });

  it("each tuning has exactly 6 strings", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id].strings).toHaveLength(6);
    }
  });
});

describe("tuningSupportsView", () => {
  it("standard tuning supports every view", () => {
    for (const view of ALL_VIEW_IDS) {
      expect(tuningSupportsView("standard", view)).toBe(true);
    }
  });

  it("open-g tuning supports only note-map", () => {
    expect(tuningSupportsView("open-g", "note-map")).toBe(true);
    expect(tuningSupportsView("open-g", "scale-positions")).toBe(false);
    expect(tuningSupportsView("open-g", "chord-shapes")).toBe(false);
  });
});

describe("VIEWS_BY_TUNING", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(VIEWS_BY_TUNING[id]).toBeDefined();
    }
  });
});

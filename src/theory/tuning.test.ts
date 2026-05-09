import { describe, it, expect } from "vitest";
import {
  TUNINGS,
  TUNING_GROUPS,
  VIEWS_BY_TUNING,
  tuningSupportsView,
  type TuningId,
} from "./tuning";
import type { ViewId } from "../views/types";

const ALL_TUNING_IDS = Object.keys(TUNINGS) as TuningId[];
const ALL_VIEW_IDS: ViewId[] = ["note-map", "scale-positions", "chord-shapes"];

// CAGED-compatible tunings preserve standard's [5,5,5,4,5] adjacent-string
// interval pattern. Step-down standards qualify; everything else does not.
const CAGED_COMPATIBLE: ReadonlySet<TuningId> = new Set([
  "standard",
  "eb-standard",
  "d-standard",
  "csharp-standard",
]);

describe("TUNINGS registry", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id]).toBeDefined();
      expect(TUNINGS[id].id).toBe(id);
    }
  });

  it("each tuning has exactly 6 strings", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id].strings).toHaveLength(6);
    }
  });

  it("standard tuning is E A D G B E (low → high)", () => {
    expect(TUNINGS.standard.strings).toEqual(["E", "A", "D", "G", "B", "E"]);
  });

  it("open-g tuning is D G D G B D (low → high)", () => {
    expect(TUNINGS["open-g"].strings).toEqual(["D", "G", "D", "G", "B", "D"]);
  });

  it("drop-d tuning is D A D G B E (low → high)", () => {
    expect(TUNINGS["drop-d"].strings).toEqual(["D", "A", "D", "G", "B", "E"]);
  });

  it("DADGAD tuning is D A D G A D (low → high)", () => {
    expect(TUNINGS.dadgad.strings).toEqual(["D", "A", "D", "G", "A", "D"]);
  });
});

describe("tuningSupportsView — CAGED-compatible tunings", () => {
  it("supports every view for tunings with standard's [5,5,5,4,5] interval pattern", () => {
    for (const id of CAGED_COMPATIBLE) {
      for (const view of ALL_VIEW_IDS) {
        expect(tuningSupportsView(id, view), `${id} should support ${view}`).toBe(true);
      }
    }
  });
});

describe("tuningSupportsView — non-CAGED tunings", () => {
  it("supports only note-map for tunings whose intervals diverge from standard", () => {
    for (const id of ALL_TUNING_IDS) {
      if (CAGED_COMPATIBLE.has(id)) continue;
      expect(tuningSupportsView(id, "note-map"), `${id} should support note-map`).toBe(
        true,
      );
      expect(
        tuningSupportsView(id, "scale-positions"),
        `${id} should NOT support scale-positions`,
      ).toBe(false);
      expect(
        tuningSupportsView(id, "chord-shapes"),
        `${id} should NOT support chord-shapes`,
      ).toBe(false);
    }
  });

  it("drop-d is note-map-only (low E lowered breaks the [5,5,5,4,5] pattern)", () => {
    expect(tuningSupportsView("drop-d", "scale-positions")).toBe(false);
  });

  it("DADGAD is note-map-only (different interval pattern)", () => {
    expect(tuningSupportsView("dadgad", "chord-shapes")).toBe(false);
  });

  it("all-fourths is note-map-only (no major-3rd B-string oddity)", () => {
    expect(tuningSupportsView("all-fourths", "scale-positions")).toBe(false);
  });
});

describe("VIEWS_BY_TUNING", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(VIEWS_BY_TUNING[id]).toBeDefined();
    }
  });
});

describe("TUNING_GROUPS", () => {
  it("references every TuningId exactly once across all groups", () => {
    const seen = new Set<TuningId>();
    for (const group of TUNING_GROUPS) {
      for (const id of group.ids) {
        expect(seen.has(id), `${id} appears in more than one group`).toBe(false);
        seen.add(id);
      }
    }
    for (const id of ALL_TUNING_IDS) {
      expect(seen.has(id), `${id} not assigned to any group`).toBe(true);
    }
    expect(seen.size).toBe(ALL_TUNING_IDS.length);
  });

  it("only references valid TuningIds", () => {
    const known = new Set(ALL_TUNING_IDS);
    for (const group of TUNING_GROUPS) {
      for (const id of group.ids) {
        expect(known.has(id), `${id} is not a defined TuningId`).toBe(true);
      }
    }
  });
});

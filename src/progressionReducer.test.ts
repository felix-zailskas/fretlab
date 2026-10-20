import { describe, it, expect } from "vitest";
import { progressionReducer, type ProgressionAction } from "./progressionReducer";
import {
  DEFAULT_PROGRESSION,
  type StoredProgression,
} from "./theory/progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "./theory/meter";

function withSlots(bars: number[]): StoredProgression {
  return {
    ...DEFAULT_PROGRESSION,
    slots: bars.map((b, i) => ({
      id: `s${i}`,
      ref: { tier: "diatonic", degree: i + 1 },
      bars: b,
    })),
  };
}

const ids = (s: StoredProgression) => s.slots.map((slot) => slot.id);

describe("progressionReducer — slots", () => {
  it("add appends a one-bar slot", () => {
    const next = progressionReducer(withSlots([2]), {
      type: "add",
      id: "new",
      ref: { tier: "borrowed", degree: 6 },
    });
    expect(next.slots[1]).toEqual({
      id: "new",
      ref: { tier: "borrowed", degree: 6 },
      bars: 1,
    });
  });

  it("remove drops the slot with that id", () => {
    expect(
      ids(progressionReducer(withSlots([1, 1, 1]), { type: "remove", id: "s1" })),
    ).toEqual(["s0", "s2"]);
  });

  it("move reorders (third → first)", () => {
    expect(
      ids(progressionReducer(withSlots([1, 1, 1]), { type: "move", from: 2, to: 0 })),
    ).toEqual(["s2", "s0", "s1"]);
  });

  it("move out of range is a no-op", () => {
    const state = withSlots([1, 1]);
    expect(progressionReducer(state, { type: "move", from: 0, to: 5 })).toBe(state);
  });

  it("set-bars applies an allowed length", () => {
    const next = progressionReducer(withSlots([1]), {
      type: "set-bars",
      id: "s0",
      bars: 0.5,
    });
    expect(next.slots[0].bars).toBe(0.5);
  });

  it("set-bars ignores a disallowed length", () => {
    const state = withSlots([1]);
    expect(progressionReducer(state, { type: "set-bars", id: "s0", bars: 5 })).toBe(
      state,
    );
  });

  it("clear empties the progression", () => {
    expect(progressionReducer(withSlots([1, 2]), { type: "clear" }).slots).toEqual([]);
  });
});

describe("progressionReducer — settings", () => {
  it("set-bpm clamps", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-bpm", bpm: 999 }).bpm,
    ).toBe(300);
  });

  it("set-click", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-click", enabled: true })
        .click,
    ).toBe(true);
  });

  it("set-loop", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-loop", loop: false }).loop,
    ).toBe(false);
  });

  it("set-visible", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-visible", visible: false })
        .visible,
    ).toBe(false);
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "set-time-signature to %s",
  (_label, preset) => {
    const next = progressionReducer(withSlots([0.5, 1, 4]), {
      type: "set-time-signature",
      sig: preset,
    });

    it("stores the new signature", () => {
      expect(next.timeSignature).toEqual(preset);
    });

    it("leaves every slot at an allowed length", () => {
      for (const slot of next.slots)
        expect(allowedSlotLengths(preset)).toContain(slot.bars);
    });

    it("keeps ½ bar only where it is allowed", () => {
      expect(next.slots[0].bars).toBe(
        allowedSlotLengths(preset).includes(0.5) ? 0.5 : 1,
      );
    });
  },
);

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}

const ACTIONS: ProgressionAction[] = [
  { type: "add", id: "n", ref: { tier: "diatonic", degree: 1 } },
  { type: "remove", id: "s1" },
  { type: "move", from: 2, to: 0 },
  { type: "set-bars", id: "s0", bars: 2 },
  { type: "clear" },
  { type: "set-bpm", bpm: 120 },
  { type: "set-time-signature", sig: { beats: 3, unit: 4 } },
  { type: "set-click", enabled: true },
  { type: "set-loop", loop: false },
  { type: "set-visible", visible: false },
];

describe.each([
  ["a multi-slot state", () => withSlots([0.5, 1, 4])],
  ["DEFAULT_PROGRESSION", () => DEFAULT_PROGRESSION],
])("progressionReducer never mutates its input (%s)", (_name, make) => {
  it.each(ACTIONS.map((a) => [a.type, a] as const))("%s", (_type, action) => {
    const state = make();
    const before = structuredClone(state);
    // Freezing makes any in-place write throw; copy so the shared default stays unfrozen.
    const input = deepFreeze(structuredClone(state));
    progressionReducer(input, action);
    expect(input).toEqual(before);
    expect(state).toEqual(before);
  });
});

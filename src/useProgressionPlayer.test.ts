// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProgressionPlayer } from "./useProgressionPlayer";
import { createFakeMetronome } from "./audio/testing";
import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  type StoredProgression,
} from "./theory/progressionStorage";
import type { ChordRef } from "./theory/harmony";
import { TIME_SIGNATURE_PRESETS, timeSignatureLabel } from "./theory/meter";

const F: ChordRef = { tier: "diatonic", degree: 4 };
const G: ChordRef = { tier: "diatonic", degree: 5 };
// Column 1 of the secondary tier is always null (spec §2), so this never resolves.
const NEVER: ChordRef = { tier: "secondary", degree: 1 };

function prime(patch: Partial<StoredProgression>) {
  localStorage.setItem(
    PROGRESSION_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PROGRESSION, ...patch }),
  );
}

function setup(selectedKey = "C") {
  const metronome = createFakeMetronome();
  const onChordChange = vi.fn();
  const hook = renderHook(() =>
    useProgressionPlayer({
      selectedKey,
      mode: "ionian",
      rowMode: "triads",
      onChordChange,
      metronomeFactory: () => metronome,
    }),
  );
  return { ...hook, metronome, onChordChange };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useProgressionPlayer — state", () => {
  it("loads the stored progression", () => {
    prime({ bpm: 140, slots: [{ id: "a", ref: F, bars: 2 }] });
    const { result } = setup();
    expect([result.current.state.bpm, result.current.state.slots.length]).toEqual([
      140, 1,
    ]);
  });

  it("saves edits to localStorage", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    const stored = JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? "{}");
    expect(stored.slots[0].ref).toEqual(F);
  });

  it("resolves slots against the current key and mode", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(NEVER));
    expect(result.current.resolvedSlots.map((r) => r.chord?.symbol ?? null)).toEqual([
      "F",
      null,
    ]);
  });

  it("setBpm clamps and forwards to the metronome", () => {
    const { result, metronome } = setup();
    act(() => result.current.setBpm(1000));
    expect([result.current.state.bpm, metronome.bpm]).toEqual([300, 300]);
  });
});

describe("useProgressionPlayer — playback", () => {
  it("announces the slot's chord when its first beat sounds", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    metronome.currentTime = 1;
    act(() => metronome.emit(0, 0.05));
    await waitFor(() => expect(onChordChange).toHaveBeenCalledWith(F));
    expect(result.current.currentSlot).toBe(0);
  });

  it("moves to the next slot after one bar of 4/4", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(G));
    act(() => result.current.play());
    metronome.currentTime = 10;
    act(() => {
      for (let beat = 0; beat <= 4; beat++) metronome.emit(beat, beat * 0.5);
    });
    await waitFor(() => expect(onChordChange).toHaveBeenLastCalledWith(G));
    expect(result.current.currentSlot).toBe(1);
  });

  it("jumpTo selects the chord without starting playback", () => {
    const { result, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.jumpTo(0));
    expect([onChordChange.mock.calls[0][0], result.current.isPlaying]).toEqual([
      F,
      false,
    ]);
  });

  it("jumpTo while playing restarts from that slot", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(G));
    act(() => result.current.play());
    act(() => result.current.jumpTo(1));
    expect(metronome.starts).toBe(2);
  });

  it("changing the time signature while playing restarts playback", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    act(() => result.current.setTimeSignature({ beats: 3, unit: 4 }));
    expect([metronome.starts, result.current.state.timeSignature.beats]).toEqual([
      2, 3,
    ]);
  });

  it("clear while playing stops", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    act(() => result.current.clear());
    expect([result.current.isPlaying, metronome.running]).toEqual([false, false]);
  });

  it("toggle starts and stops", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    act(() => result.current.toggle());
    const afterFirst = result.current.isPlaying;
    act(() => result.current.toggle());
    expect([afterFirst, result.current.isPlaying]).toEqual([true, false]);
  });
});

describe("useProgressionPlayer — metronome only", () => {
  // Emits the next beat and waits for its frame to reach React state.
  async function step(
    metronome: ReturnType<typeof setup>["metronome"],
    beat: number,
    expected: () => void,
  ) {
    metronome.currentTime = beat + 1;
    act(() => metronome.emit(beat, beat));
    await waitFor(expected);
  }

  it("plays with zero slots", () => {
    const { result, metronome } = setup();
    act(() => result.current.play());
    expect([
      result.current.metronomeOnly,
      result.current.isPlaying,
      metronome.running,
    ]).toEqual([true, true, true]);
  });

  it.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
    "beatInBar counts one bar of %s and wraps",
    async (_label, preset) => {
      prime({ timeSignature: preset });
      const { result, metronome, onChordChange } = setup();
      act(() => result.current.play());
      for (let beat = 0; beat <= preset.beats; beat++) {
        await step(metronome, beat, () =>
          expect(result.current.beatInBar).toBe(beat % preset.beats),
        );
      }
      expect([onChordChange.mock.calls.length, result.current.currentSlot]).toEqual([
        0,
        null,
      ]);
    },
  );

  it("forces the click on even when Click is off", () => {
    const { result, metronome } = setup();
    act(() => result.current.play());
    act(() => result.current.setClick(false));
    expect([result.current.state.click, metronome.click]).toEqual([false, true]);
  });

  it("keeps running past one bar with Loop off", async () => {
    prime({ loop: false });
    const { result, metronome } = setup();
    act(() => result.current.play());
    for (let beat = 0; beat < 9; beat++) {
      await step(metronome, beat, () =>
        expect(result.current.beatInBar).toBe(beat % 4),
      );
    }
    expect([result.current.isPlaying, metronome.running]).toEqual([true, true]);
  });

  it("runs when every slot is unplayable", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(NEVER));
    act(() => result.current.play());
    expect([result.current.metronomeOnly, metronome.running]).toEqual([true, true]);
  });

  it("runs under the All key without announcing chords", async () => {
    prime({ slots: [{ id: "f", ref: F, bars: 1 }] });
    const { result, metronome, onChordChange } = setup("all");
    act(() => result.current.play());
    await step(metronome, 0, () => expect(result.current.beatInBar).toBe(0));
    await step(metronome, 1, () => expect(result.current.beatInBar).toBe(1));
    expect([result.current.metronomeOnly, onChordChange.mock.calls.length]).toEqual([
      true,
      0,
    ]);
  });

  it("adding a playable chord restarts from slot 0 and announces it", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.play());
    act(() => result.current.add(F));
    expect([metronome.starts, metronome.click]).toEqual([2, false]);
    await step(metronome, 0, () => expect(onChordChange).toHaveBeenCalledWith(F));
    expect(result.current.currentSlot).toBe(0);
  });

  it("removing the last playable slot keeps playing as a metronome", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    await step(metronome, 0, () => expect(onChordChange).toHaveBeenCalledWith(F));
    act(() => result.current.remove(result.current.state.slots[0].id));
    await step(metronome, 1, () => expect(result.current.beatInBar).toBe(1));
    expect([
      result.current.isPlaying,
      result.current.metronomeOnly,
      result.current.currentSlot,
      metronome.starts,
      metronome.click,
    ]).toEqual([true, true, null, 1, true]);
  });

  it("moving from the All key to a real key restarts once and announces the chord", async () => {
    prime({ slots: [{ id: "f", ref: F, bars: 1 }] });
    const metronome = createFakeMetronome();
    const onChordChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectedKey }) =>
        useProgressionPlayer({
          selectedKey,
          mode: "ionian",
          rowMode: "triads",
          onChordChange,
          metronomeFactory: () => metronome,
        }),
      { initialProps: { selectedKey: "all" } },
    );
    act(() => result.current.play());
    expect(result.current.metronomeOnly).toBe(true);
    rerender({ selectedKey: "C" });
    expect(metronome.starts).toBe(2);
    await step(metronome, 0, () => expect(onChordChange).toHaveBeenCalledWith(F));
  });

  it("changing the time signature restarts the metronome", () => {
    const { result, metronome } = setup();
    act(() => result.current.play());
    act(() => result.current.setTimeSignature({ beats: 3, unit: 4 }));
    expect([metronome.starts, result.current.isPlaying]).toEqual([2, true]);
  });
});

describe("useProgressionPlayer — visibility", () => {
  it("hiding the panel stops playback", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    act(() => result.current.setVisible(false));
    expect([result.current.isPlaying, metronome.running]).toEqual([false, false]);
  });
});

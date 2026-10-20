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
  it("cannot play when no slot resolves", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(NEVER));
    act(() => result.current.play());
    expect([result.current.canPlay, metronome.running]).toEqual([false, false]);
  });

  it("cannot play under the All key", () => {
    const { result } = setup("all");
    act(() => result.current.add(F));
    expect(result.current.canPlay).toBe(false);
  });

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

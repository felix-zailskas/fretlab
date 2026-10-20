import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTransport, type TransportSnapshot } from "./transport";
import { createFakeMetronome, type FakeMetronome } from "./testing";
import { buildTimeline, type TimeSignature } from "../theory/meter";

const FOUR_FOUR: TimeSignature = { beats: 4, unit: 4 };

function manualFrames() {
  let pending: (() => void) | null = null;
  let handle = 0;
  return {
    request(cb: () => void) {
      pending = cb;
      return ++handle;
    },
    cancel() {
      pending = null;
    },
    flush() {
      const cb = pending;
      pending = null;
      cb?.();
    },
  };
}

let metronome: FakeMetronome;
let frames: ReturnType<typeof manualFrames>;
let snapshot: TransportSnapshot;
const onPosition = vi.fn();
const onEnd = vi.fn();

function start(startBeat = 0) {
  const transport = createTransport(metronome, frames);
  transport.start({
    bpm: 120,
    click: false,
    startBeat,
    snapshot: () => snapshot,
    onPosition,
    onEnd,
  });
  return transport;
}

beforeEach(() => {
  metronome = createFakeMetronome();
  frames = manualFrames();
  snapshot = { timeline: buildTimeline([1, 1], FOUR_FOUR), sig: FOUR_FOUR, loop: true };
  onPosition.mockReset();
  onEnd.mockReset();
});

describe("createTransport", () => {
  it("starts the metronome at the given BPM", () => {
    start();
    expect(metronome.bpm).toBe(120);
  });

  it("waits until the audio clock reaches a beat before reporting it", () => {
    start();
    metronome.emit(0, 0.05);
    metronome.currentTime = 0.01;
    frames.flush();
    expect(onPosition).not.toHaveBeenCalled();
  });

  it("reports the position once the beat's time has passed", () => {
    start();
    metronome.emit(0, 0.05);
    metronome.currentTime = 0.05;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 0, beatInBar: 0 });
  });

  it("offsets metronome beats by startBeat", () => {
    start(4);
    metronome.emit(0, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 1, beatInBar: 0 });
  });

  it("wraps to the first slot when loop is on", () => {
    start();
    metronome.emit(8, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 0, beatInBar: 0 });
  });

  it("ends after the last slot when loop is off", () => {
    snapshot = { ...snapshot, loop: false };
    start();
    metronome.emit(8, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(metronome.running).toBe(false);
  });

  it("ends when the timeline becomes empty mid-play", () => {
    start();
    snapshot = { ...snapshot, timeline: buildTimeline([], FOUR_FOUR) };
    metronome.emit(1, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("locates against the latest snapshot after an edit", () => {
    start();
    snapshot = { ...snapshot, timeline: buildTimeline([0.5, 1], FOUR_FOUR) };
    metronome.emit(2, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 1, beatInBar: 2 });
  });

  it("gives the metronome accents from the timeline beat", () => {
    start(2);
    expect([metronome.accentOf?.(0), metronome.accentOf?.(2)]).toEqual([
      "weak",
      "strong",
    ]);
  });

  it("stop() halts the metronome and ignores later beats", () => {
    const transport = start();
    transport.stop();
    metronome.emit(0, 0);
    frames.flush();
    expect([metronome.running, onPosition.mock.calls.length]).toEqual([false, 0]);
  });

  it("setClick forwards to the metronome", () => {
    const transport = start();
    transport.setClick(true);
    expect(metronome.click).toBe(true);
  });

  it("setBpm forwards to the metronome", () => {
    const transport = start();
    transport.setBpm(200);
    expect(metronome.bpm).toBe(200);
  });

  it("maps absolute beat indices when the metronome skips beats", () => {
    start();
    metronome.emit(0, 0);
    metronome.emit(5, 0.1);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition.mock.calls).toEqual([
      [{ slotIndex: 0, beatInBar: 0 }],
      [{ slotIndex: 1, beatInBar: 1 }],
    ]);
  });

  it("ends when a skipped beat jumps past the end with loop off", () => {
    snapshot = { ...snapshot, loop: false };
    start();
    metronome.emit(0, 0);
    metronome.emit(20, 0.1);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { CLICK_FREQUENCIES, createMetronome, type Metronome } from "./metronome";
import { FakeAudioContext } from "./testing";

let ctx: FakeAudioContext;
let factory: Mock<() => AudioContext>;
let metronome: Metronome;
let beats: [number, number][];
const onBeat = (beat: number, time: number) => beats.push([beat, time]);

function advanceTo(time: number) {
  ctx.currentTime = time;
  vi.advanceTimersByTime(25);
}

beforeEach(() => {
  vi.useFakeTimers();
  ctx = new FakeAudioContext();
  factory = vi.fn(() => ctx as unknown as AudioContext);
  metronome = createMetronome(factory);
  beats = [];
});

afterEach(() => {
  metronome.stop();
  vi.useRealTimers();
});

describe("createMetronome — context", () => {
  it("does not create an AudioContext before start()", () => {
    expect(factory).not.toHaveBeenCalled();
  });

  it("creates the context once across restarts", () => {
    metronome.start({ bpm: 120, onBeat });
    metronome.stop();
    metronome.start({ bpm: 120, onBeat });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("resumes a suspended context", () => {
    ctx.state = "suspended";
    metronome.start({ bpm: 120, onBeat });
    expect(ctx.resumeCalls).toBe(1);
  });

  it("now() reads the audio clock", () => {
    metronome.start({ bpm: 120, onBeat });
    ctx.currentTime = 3.5;
    expect(metronome.now()).toBe(3.5);
  });
});

describe("createMetronome — scheduling", () => {
  it("schedules beat 0 shortly after start", () => {
    metronome.start({ bpm: 120, onBeat });
    expect(beats[0][0]).toBe(0);
    expect(beats[0][1]).toBeCloseTo(0.05);
  });

  it("schedules the next beat one beat later as the clock advances", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(beats[1][0]).toBe(1);
    expect(beats[1][1]).toBeCloseTo(0.55);
  });

  it("never schedules a beat twice across overlapping windows", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.47);
    advanceTo(0.49);
    advanceTo(0.52);
    expect(beats.filter(([b]) => b === 1)).toHaveLength(1);
  });

  it("stops scheduling after stop()", () => {
    metronome.start({ bpm: 120, onBeat });
    metronome.stop();
    advanceTo(5);
    expect(beats).toHaveLength(1);
  });

  it("applies a BPM change from the next unscheduled beat", () => {
    metronome.start({ bpm: 120, onBeat }); // beat 0 @ 0.05
    advanceTo(0.5); // beat 1 @ 0.55
    metronome.setBpm(60); // beat 2 still @ 1.05, then 1 s apart
    advanceTo(1.0);
    advanceTo(2.0);
    expect(beats.map(([b, t]) => [b, Number(t.toFixed(3))])).toEqual([
      [0, 0.05],
      [1, 0.55],
      [2, 1.05],
      [3, 2.05],
    ]);
  });

  it("skips missed beats instead of bursting after a throttled gap", () => {
    metronome.start({ bpm: 120, onBeat }); // beat 0 @ 0.05
    advanceTo(10); // timers were throttled for ~10 s
    expect(beats.map(([b]) => b)).toEqual([0, 20]);
  });
});

describe("createMetronome — click", () => {
  it("is silent when click is disabled", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(ctx.clicks).toEqual([]);
  });

  it("schedules a click at each beat's time with its accent pitch", () => {
    metronome.setClick(true, (beat) => (beat === 0 ? "strong" : "weak"));
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(ctx.clicks.map((c) => c.frequency)).toEqual([
      CLICK_FREQUENCIES.strong,
      CLICK_FREQUENCIES.weak,
    ]);
  });

  it("uses descending pitches for strong, medium, weak", () => {
    expect(CLICK_FREQUENCIES.strong).toBeGreaterThan(CLICK_FREQUENCIES.medium);
    expect(CLICK_FREQUENCIES.medium).toBeGreaterThan(CLICK_FREQUENCIES.weak);
  });
});

describe("createMetronome — invalid BPM", () => {
  it("clamps non-positive and out-of-range BPM at start() without hanging", () => {
    for (const bad of [0, -60, 1e9]) {
      beats = [];
      metronome.start({ bpm: bad, onBeat });
      advanceTo(ctx.currentTime + 1);
      expect(beats.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the previous BPM for NaN/Infinity at start()", () => {
    metronome.start({ bpm: Number.NaN, onBeat });
    advanceTo(0.5);
    expect(beats.length).toBeGreaterThan(0);
    metronome.start({ bpm: Number.POSITIVE_INFINITY, onBeat });
    advanceTo(1);
    expect(beats.length).toBeGreaterThan(0);
  });

  it("clamps setBpm to 30-300 and ignores non-finite values", () => {
    metronome.start({ bpm: 120, onBeat });
    metronome.setBpm(0);
    metronome.setBpm(Number.NaN);
    metronome.setBpm(-5);
    for (let s = 0.5; s <= 6; s += 0.5) advanceTo(s);
    // beat 1 keeps the old spacing; after that the 30 BPM clamp gives 2 s gaps
    const times = beats.map(([, t]) => Number(t.toFixed(3)));
    expect(times).toEqual([0.05, 0.55, 2.55, 4.55, 6.55].slice(0, times.length));
    expect(times.length).toBeGreaterThan(3);
  });
});

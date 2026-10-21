// Web Audio look-ahead scheduler ("A Tale of Two Clocks"): a coarse
// setTimeout loop schedules beats a little ahead on the precise audio clock.
// Not theory and not React — the timing core (beatsInWindow) lives in meter.ts.
import { BPM_MAX, BPM_MIN } from "../theory/progressionStorage";
import { beatsInWindow, secondsPerBeat, type Accent } from "../theory/meter";

export type Metronome = {
  start(opts: { bpm: number; onBeat: (beat: number, time: number) => void }): void;
  stop(): void;
  setBpm(bpm: number): void;
  setClick(enabled: boolean, accentOf: (beat: number) => Accent): void;
  now(): number; // AudioContext.currentTime
};

export type AudioContextFactory = () => AudioContext;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const START_DELAY_S = 0.05;
const CLICK_LENGTH_S = 0.03;
const CLICK_GAIN = 0.5;

// beatsInWindow never terminates for bpm <= 0 (or NaN), so every tempo that
// reaches the scheduler goes through here. Non-finite input keeps `fallback`.
function sanitizeBpm(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, value));
}

export const CLICK_FREQUENCIES: Record<Accent, number> = {
  strong: 1500,
  medium: 1100,
  weak: 800,
};

export function createMetronome(
  createContext: AudioContextFactory = () => new AudioContext(),
): Metronome {
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let onBeat: ((beat: number, time: number) => void) | null = null;
  let bpm = 120;
  let anchorTime = 0;
  let anchorBeat = 0;
  let nextBeat = 0;
  let clickEnabled = false;
  let accentOf: (beat: number) => Accent = () => "weak";

  function timeOf(beat: number): number {
    return anchorTime + (beat - anchorBeat) * secondsPerBeat(bpm);
  }

  function scheduleClick(time: number, accent: Accent) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = CLICK_FREQUENCIES[accent];
    env.gain.setValueAtTime(CLICK_GAIN, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + CLICK_LENGTH_S);
    osc.connect(env);
    env.connect(bus);
    osc.start(time);
    osc.stop(time + CLICK_LENGTH_S);
  }

  function tick() {
    if (!ctx || !onBeat) return;
    const now = ctx.currentTime;
    for (const n of beatsInWindow(now, now + SCHEDULE_AHEAD_S, anchorTime, bpm)) {
      const beat = anchorBeat + n;
      if (beat < nextBeat) continue;
      const time = timeOf(beat);
      if (clickEnabled) scheduleClick(time, accentOf(beat));
      onBeat(beat, time);
      nextBeat = beat + 1;
    }
    timer = setTimeout(tick, LOOKAHEAD_MS);
  }

  function stop() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    onBeat = null;
    if (bus) {
      bus.disconnect();
      bus = null;
    }
  }

  return {
    start(opts) {
      stop();
      if (!ctx) ctx = createContext();
      if (ctx.state === "suspended") void ctx.resume();
      bus = ctx.createGain();
      bus.connect(ctx.destination);
      bpm = sanitizeBpm(opts.bpm, bpm);
      onBeat = opts.onBeat;
      anchorBeat = 0;
      nextBeat = 0;
      anchorTime = ctx.currentTime + START_DELAY_S;
      tick();
    },
    stop,
    setBpm(next) {
      if (onBeat) {
        anchorTime = timeOf(nextBeat);
        anchorBeat = nextBeat;
      }
      bpm = sanitizeBpm(next, bpm);
    },
    setClick(enabled, accent) {
      clickEnabled = enabled;
      accentOf = accent;
    },
    now() {
      return ctx ? ctx.currentTime : 0;
    },
  };
}

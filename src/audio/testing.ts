// Test doubles for the audio layer. Imported only by tests; never by app code.
// jsdom has no AudioContext, so tests either inject these or stub the global:
//   vi.stubGlobal("AudioContext", FakeAudioContext)
import type { Accent } from "../theory/meter";
import type { Metronome } from "./metronome";

export type ScheduledClick = { frequency: number; startAt: number };

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  resumeCalls = 0;
  readonly destination = {};
  readonly clicks: ScheduledClick[] = [];

  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }

  createGain() {
    return {
      gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    };
  }

  createOscillator() {
    const clicks = this.clicks;
    const osc = {
      frequency: { value: 0 },
      connect() {},
      start(when: number) {
        clicks.push({ frequency: osc.frequency.value, startAt: when });
      },
      stop() {},
    };
    return osc;
  }
}

export type FakeMetronome = Metronome & {
  currentTime: number;
  running: boolean;
  starts: number;
  bpm: number;
  click: boolean;
  accentOf: ((beat: number) => Accent) | null;
  emit(beat: number, time: number): void;
};

export function createFakeMetronome(): FakeMetronome {
  let onBeat: ((beat: number, time: number) => void) | null = null;
  const fake: FakeMetronome = {
    currentTime: 0,
    running: false,
    starts: 0,
    bpm: 0,
    click: false,
    accentOf: null,
    start(opts) {
      onBeat = opts.onBeat;
      fake.running = true;
      fake.starts++;
      fake.bpm = opts.bpm;
    },
    stop() {
      onBeat = null;
      fake.running = false;
    },
    setBpm(bpm) {
      fake.bpm = bpm;
    },
    setClick(enabled, accentOf) {
      fake.click = enabled;
      fake.accentOf = accentOf;
    },
    now() {
      return fake.currentTime;
    },
    emit(beat, time) {
      onBeat?.(beat, time);
    },
  };
  return fake;
}

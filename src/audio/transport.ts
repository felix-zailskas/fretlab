// Bridges the audio clock and the UI: the metronome schedules beats ~100 ms
// ahead; the transport holds them in a queue and reports each one on the
// animation frame where the audio clock reaches it, so visuals line up with
// the click.
import {
  accentPattern,
  locate,
  type Accent,
  type TimeSignature,
  type Timeline,
  type TimelinePosition,
} from "../theory/meter";
import type { Metronome } from "./metronome";

export type TransportSnapshot = {
  timeline: Timeline;
  sig: TimeSignature;
  loop: boolean;
};

export type TransportStartOptions = {
  bpm: number;
  click: boolean;
  startBeat: number;
  snapshot: () => TransportSnapshot;
  onPosition: (pos: TimelinePosition) => void;
  onEnd: () => void;
};

export type FrameScheduler = {
  request(cb: () => void): number;
  cancel(handle: number): void;
};

export type Transport = {
  start(opts: TransportStartOptions): void;
  stop(): void;
  setBpm(bpm: number): void;
  setClick(enabled: boolean): void;
};

const browserFrames: FrameScheduler = {
  request: (cb) => requestAnimationFrame(() => cb()),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export function createTransport(
  metronome: Metronome,
  frames: FrameScheduler = browserFrames,
): Transport {
  let opts: TransportStartOptions | null = null;
  let queue: { beat: number; time: number }[] = [];
  let frame: number | null = null;

  function accentOf(beat: number): Accent {
    if (!opts) return "weak";
    const { timeline, sig } = opts.snapshot();
    if (timeline.totalBeats === 0) return "weak";
    return accentPattern(sig)[locate(opts.startBeat + beat, timeline, sig).beatInBar];
  }

  function stop() {
    metronome.stop();
    if (frame !== null) frames.cancel(frame);
    frame = null;
    queue = [];
    opts = null;
  }

  function onFrame() {
    frame = null;
    const current = opts;
    if (!current) return;
    const now = metronome.now();
    while (queue.length > 0 && queue[0].time <= now) {
      const next = queue.shift();
      if (!next) break;
      const { timeline, sig, loop } = current.snapshot();
      if (timeline.totalBeats === 0 || (!loop && next.beat >= timeline.totalBeats)) {
        stop();
        current.onEnd();
        return;
      }
      current.onPosition(locate(next.beat, timeline, sig));
    }
    frame = frames.request(onFrame);
  }

  return {
    start(next) {
      stop();
      opts = next;
      metronome.setClick(next.click, accentOf);
      metronome.start({
        bpm: next.bpm,
        onBeat: (beat, time) => queue.push({ beat: next.startBeat + beat, time }),
      });
      frame = frames.request(onFrame);
    },
    stop,
    setBpm: (bpm) => metronome.setBpm(bpm),
    setClick: (enabled) => metronome.setClick(enabled, accentOf),
  };
}

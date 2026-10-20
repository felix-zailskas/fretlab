// Meter math for the progression player. Pure — no React, no audio.
// BPM always counts the time signature's unit (6/8 at 120 = 120 eighths/min).

export type TimeSignature = { beats: number; unit: 2 | 4 | 8 | 16 };
export type Accent = "strong" | "medium" | "weak";
export type Timeline = { starts: number[]; totalBeats: number };
export type TimelinePosition = { slotIndex: number; beatInBar: number };

export const TIME_SIGNATURE_PRESETS: readonly TimeSignature[] = [
  { beats: 2, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 4, unit: 4 },
  { beats: 5, unit: 4 },
  { beats: 6, unit: 8 },
  { beats: 7, unit: 8 },
  { beats: 9, unit: 8 },
  { beats: 12, unit: 8 },
];

// Irregular meters: group sizes, a medium accent at each group start.
const IRREGULAR_GROUPS: Partial<Record<number, readonly number[]>> = {
  5: [3, 2],
  7: [2, 2, 3],
};

// Floating-point tolerance for beat-time comparisons (seconds).
const EPSILON = 1e-9;

export function timeSignatureLabel(sig: TimeSignature): string {
  return `${sig.beats}/${sig.unit}`;
}

function isCompound(sig: TimeSignature): boolean {
  return sig.beats > 3 && sig.beats % 3 === 0 && (sig.unit === 8 || sig.unit === 16);
}

export function accentPattern(sig: TimeSignature): Accent[] {
  const pattern: Accent[] = Array.from({ length: sig.beats }, () => "weak");
  const groups = IRREGULAR_GROUPS[sig.beats];
  if (groups) {
    let start = 0;
    for (const size of groups) {
      pattern[start] = "medium";
      start += size;
    }
  } else if (isCompound(sig)) {
    for (let i = 3; i < sig.beats; i += 3) pattern[i] = "medium";
  }
  pattern[0] = "strong";
  return pattern;
}

export function allowedSlotLengths(sig: TimeSignature): number[] {
  return sig.beats % 2 === 0 ? [0.5, 1, 2, 3, 4] : [1, 2, 3, 4];
}

export function snapSlotLength(bars: number, sig: TimeSignature): number {
  return allowedSlotLengths(sig).includes(bars) ? bars : 1;
}

export function beatsPerSlot(bars: number, sig: TimeSignature): number {
  return bars * sig.beats;
}

export function buildTimeline(
  slotBars: readonly number[],
  sig: TimeSignature,
): Timeline {
  const starts: number[] = [];
  let totalBeats = 0;
  for (const bars of slotBars) {
    starts.push(totalBeats);
    totalBeats += beatsPerSlot(bars, sig);
  }
  return { starts, totalBeats };
}

export function locate(
  beat: number,
  timeline: Timeline,
  sig: TimeSignature,
): TimelinePosition {
  const total = timeline.totalBeats;
  if (total <= 0) throw new RangeError("locate: timeline is empty");
  const wrapped = ((beat % total) + total) % total;
  let slotIndex = 0;
  for (let i = timeline.starts.length - 1; i >= 0; i--) {
    if (timeline.starts[i] <= wrapped) {
      slotIndex = i;
      break;
    }
  }
  return { slotIndex, beatInBar: wrapped % sig.beats };
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

export function beatsInWindow(
  fromTime: number,
  toTime: number,
  startTime: number,
  bpm: number,
): number[] {
  const spb = secondsPerBeat(bpm);
  const first = Math.max(0, Math.ceil((fromTime - startTime) / spb - EPSILON));
  const beats: number[] = [];
  for (let n = first; startTime + n * spb < toTime - EPSILON; n++) beats.push(n);
  return beats;
}

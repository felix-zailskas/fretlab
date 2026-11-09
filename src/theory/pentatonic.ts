import { MODE_INTERVALS, type Mode } from "./modes";
import { getNoteIndex } from "./notes";

export type ScaleType = "full" | "pentatonic";

// 0-based indices into MODE_INTERVALS[mode] that the pentatonic drops.
// Only the two modes with a conventional pentatonic are listed:
// major pentatonic = Ionian without 4 and 7, minor pentatonic = Aeolian
// without 2 and ♭6.
export const PENTATONIC_DROPPED_DEGREES: Readonly<
  Partial<Record<Mode, readonly number[]>>
> = {
  ionian: [3, 6],
  aeolian: [1, 5],
};

export function isPentatonicAvailable(mode: Mode): boolean {
  return PENTATONIC_DROPPED_DEGREES[mode] !== undefined;
}

// Pitch classes of the pentatonic built on `key` in `mode`. Empty for modes
// without a pentatonic. Pitch classes only — spelling comes from the 7-note
// parent spelling map, never from spelling five intervals directly.
export function getPentatonicPitchClasses(
  key: string,
  mode: Mode,
): ReadonlySet<number> {
  const dropped = PENTATONIC_DROPPED_DEGREES[mode];
  if (!dropped) return new Set();
  const root = getNoteIndex(key);
  return new Set(
    MODE_INTERVALS[mode]
      .filter((_, i) => !dropped.includes(i))
      .map((interval) => (root + interval) % 12),
  );
}

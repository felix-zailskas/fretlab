// Default highest fret rendered by the Fretboard. The user can override
// the visible range via FretRangeControl; this is just the default end.
export const DEFAULT_END_FRET = 15;
export const DEFAULT_END_FRET_MOBILE = 12;

// Custom md breakpoint override — used for one-time mobile detection on mount.
export const MOBILE_BREAKPOINT = 900;

// Absolute UI ceiling — the longest commonly-built electric neck.
// FretRangeControl clamps endFret to this value.
export const MAX_FRET = 24;

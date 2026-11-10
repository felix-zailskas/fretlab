import { useEffect, useMemo, useState } from "react";
import type { NoteMarker } from "../../theory/types";

export type KeyedMarker = { key: string; marker: NoteMarker };

// How long a removed marker stays on screen while it fades out. Matches the
// note-leave animation in index.css.
export const MARKER_FADE_MS = 200;

// Keys markers by fret position so a note that stays put across a chord
// change keeps its element: its colour then transitions instead of the
// circle being torn down and redrawn. Repeats of the same position get a
// running suffix.
export function keyMarkers(markers: ReadonlyArray<NoteMarker>): KeyedMarker[] {
  const seen = new Map<string, number>();
  return markers.map((marker) => {
    const base = `${marker.string}-${marker.fret}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { key: n === 0 ? base : `${base}#${n}`, marker };
  });
}

// Returns the current markers plus the ones that just disappeared, so the
// board can fade the latter out rather than cutting them.
export function useMarkerTransitions(markers: ReadonlyArray<NoteMarker>): {
  current: KeyedMarker[];
  leaving: KeyedMarker[];
} {
  const current = useMemo(() => keyMarkers(markers), [markers]);
  const [prev, setPrev] = useState(current);
  const [leaving, setLeaving] = useState<KeyedMarker[]>([]);

  // Diff against the previous render's markers during render (React's
  // "adjust state when a prop changes" pattern) so the leaving set is ready
  // in the same commit as the new markers.
  if (prev !== current) {
    setPrev(current);
    const now = new Set(current.map((k) => k.key));
    const gone = prev.filter((k) => !now.has(k.key));
    setLeaving((l) => [...l.filter((k) => !now.has(k.key)), ...gone]);
  }

  useEffect(() => {
    if (leaving.length === 0) return;
    const t = setTimeout(() => setLeaving([]), MARKER_FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  return { current, leaving };
}

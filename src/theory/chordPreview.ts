import type { NoteDisplayRole, NoteMarker } from "./types";

const CHORD_ROLES: ReadonlySet<NoteDisplayRole> = new Set([
  "root",
  "third",
  "fifth",
  "seventh",
]);

const at = (m: NoteMarker) => `${m.string}-${m.fret}`;

// Where the next chord's highlighted tones land — the targets to aim for at
// the change. Both marker lists come from the same highlight settings, so a
// role switched off in Highlight is already a plain scale note and gets no
// target. A spot that keeps its role across the change (C's root staying the
// root of C7) is left out: nothing changes there. A shared note that changes
// role (C: 3rd of Am → root of C) is a new target and is kept.
export function previewTargets(
  current: ReadonlyArray<NoteMarker>,
  next: ReadonlyArray<NoteMarker>,
): NoteMarker[] {
  const roleNow = new Map(current.map((m) => [at(m), m.role]));
  const seen = new Set<string>();
  return next.filter((m) => {
    if (!CHORD_ROLES.has(m.role) || roleNow.get(at(m)) === m.role) return false;
    if (seen.has(at(m))) return false;
    seen.add(at(m));
    return true;
  });
}

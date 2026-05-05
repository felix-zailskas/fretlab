export type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

export type IntervalRole =
  | "root"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "sixth"
  | "seventh";

export type NoteDisplayRole =
  | "root"
  | "third"
  | "fifth"
  | "seventh"
  | "scale"
  | "muted";

export type NoteMarker = {
  string: number; // 0 = low E, 5 = high E
  fret: number; // 0 = open, up to 15
  note: string; // Display name (e.g., "C", "F#", "Bb")
  role: NoteDisplayRole;
};

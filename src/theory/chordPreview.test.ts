import { describe, it, expect } from "vitest";
import { previewTargets } from "./chordPreview";
import type { NoteDisplayRole, NoteMarker } from "./types";

const m = (string: number, fret: number, role: NoteDisplayRole): NoteMarker => ({
  string,
  fret,
  note: "X",
  role,
});

describe("previewTargets", () => {
  it("targets the next chord's tones that aren't on the board yet", () => {
    expect(previewTargets([m(0, 3, "root")], [m(1, 5, "third")])).toEqual([
      m(1, 5, "third"),
    ]);
  });

  it("targets a shared note that changes role", () => {
    expect(previewTargets([m(0, 3, "third")], [m(0, 3, "root")])).toEqual([
      m(0, 3, "root"),
    ]);
  });

  it("skips a note that keeps its role across the change", () => {
    expect(previewTargets([m(0, 3, "root")], [m(0, 3, "root")])).toEqual([]);
  });

  it("targets a scale note that becomes a chord tone", () => {
    expect(previewTargets([m(0, 3, "scale")], [m(0, 3, "third")])).toEqual([
      m(0, 3, "third"),
    ]);
  });

  it("ignores the next chord's non-chord markers (including hidden roles)", () => {
    expect(previewTargets([], [m(0, 3, "scale"), m(0, 5, "muted")])).toEqual([]);
  });

  it("lists each position once", () => {
    expect(previewTargets([], [m(0, 3, "root"), m(0, 3, "root")])).toHaveLength(1);
  });
});

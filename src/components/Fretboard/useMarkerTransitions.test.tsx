import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Fretboard } from "./Fretboard";
import { keyMarkers, MARKER_FADE_MS } from "./useMarkerTransitions";
import type { NoteMarker } from "../../theory/types";
import { TUNINGS } from "../../theory/tuning";

const note = (string: number, fret: number, role: NoteMarker["role"]): NoteMarker => ({
  string,
  fret,
  note: "C",
  role,
});

const ALL_STRINGS = new Set([0, 1, 2, 3, 4, 5]);

function Board({ markers }: { markers: NoteMarker[] }) {
  return (
    <Fretboard
      markers={markers}
      tuning={TUNINGS.standard}
      enabledStrings={ALL_STRINGS}
      onToggleString={() => {}}
    />
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("keyMarkers", () => {
  it("keys by position, ignoring role", () => {
    expect(keyMarkers([note(1, 3, "root")])[0].key).toBe(
      keyMarkers([note(1, 3, "third")])[0].key,
    );
  });

  it("keeps repeats of one position distinct", () => {
    const keys = keyMarkers([note(1, 3, "root"), note(1, 3, "fifth")]).map(
      (k) => k.key,
    );
    expect(new Set(keys).size).toBe(2);
  });
});

describe("Fretboard note transitions", () => {
  it("recolours a note that stays put instead of redrawing it", () => {
    const { rerender } = render(<Board markers={[note(1, 3, "root")]} />);
    const before = screen.getByTestId("note-marker");
    rerender(<Board markers={[note(1, 3, "third")]} />);
    const after = screen.getByTestId("note-marker");
    expect(after).toBe(before);
    expect(after).toHaveAttribute("data-role", "third");
  });

  it("fades a removed note out, then drops it", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <Board markers={[note(1, 3, "root"), note(2, 5, "fifth")]} />,
    );
    rerender(<Board markers={[note(1, 3, "root")]} />);
    expect(screen.getAllByTestId("note-marker")).toHaveLength(1);
    expect(container.querySelectorAll(".note-leave")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(MARKER_FADE_MS);
    });
    expect(container.querySelectorAll(".note-leave")).toHaveLength(0);
  });
});

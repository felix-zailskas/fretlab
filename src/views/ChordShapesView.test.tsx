import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChordShapesView } from "./ChordShapesView";
import { useChordShapesState } from "./useChordShapesState";
import { TUNINGS } from "../theory/tuning";
import type { ChordToneSource } from "../theory/harmony";
import type { HighlightableRole } from "../theory/types";

const F_MAJOR: ChordToneSource = { quality: "maj", notes: ["F", "A", "C"] };
const E_DIM: ChordToneSource = { quality: "dim", notes: ["E", "G", "Bb"] };

function Harness({ chord }: { chord: ChordToneSource }) {
  const controls = useChordShapesState();
  return (
    <ChordShapesView
      tuning={TUNINGS.standard}
      selectedKey="F"
      startFret={0}
      endFret={15}
      selectedChord={chord}
      chordRowMode="triads"
      enabledHighlights={new Set<HighlightableRole>(["root", "third", "fifth"])}
      onToggleRole={() => {}}
      controls={controls}
      modalMode="ionian"
      enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
      onToggleString={() => {}}
    />
  );
}

async function switchToCaged() {
  await userEvent.click(screen.getByRole("radio", { name: "CAGED" }));
}

describe("ChordShapesView — CAGED", () => {
  it("swaps the string-set selectors for C-A-G-E-D toggles with E and A on", async () => {
    render(<Harness chord={F_MAJOR} />);
    expect(screen.getByRole("group", { name: "String groups" })).toBeInTheDocument();
    await switchToCaged();
    expect(
      screen.queryByRole("group", { name: "String groups" }),
    ).not.toBeInTheDocument();
    const shapes = screen.getByRole("group", { name: "CAGED shapes" });
    const pressed = Array.from(shapes.querySelectorAll('[aria-pressed="true"]')).map(
      (b) => b.textContent,
    );
    expect(pressed).toEqual(["A", "E"]);
  });

  it("labels each placement box with its shape and draws the F barre", async () => {
    render(<Harness chord={F_MAJOR} />);
    await switchToCaged();
    const labels = screen
      .getAllByTestId("position-window")
      .map((w) => w.getAttribute("data-label"));
    expect(labels).toContain("E-shape");
    expect(labels).toContain("A-shape");
    expect(
      screen.getAllByTestId("barre").some((b) => b.getAttribute("data-fret") === "1"),
    ).toBe(true);
  });

  it("explains that a diminished triad has no CAGED shapes", async () => {
    render(<Harness chord={E_DIM} />);
    await switchToCaged();
    expect(screen.getByText("No CAGED shapes for this chord.")).toBeInTheDocument();
  });

  it("asks for a shape when every toggle is off", async () => {
    render(<Harness chord={F_MAJOR} />);
    await switchToCaged();
    await userEvent.click(screen.getByRole("button", { name: "E" }));
    await userEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByText("Toggle a shape to begin.")).toBeInTheDocument();
  });
});

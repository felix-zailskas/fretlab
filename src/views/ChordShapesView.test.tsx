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

const CHROME = {
  tabs: null,
  scaleName: "F Ionian (Major)",
  scale: null,
  sharedSymbols: [],
};

const C_MAJOR: ChordToneSource = { quality: "maj", notes: ["C", "E", "G"] };

function Harness({
  chord,
  previewChord = null,
  rowMode = "triads",
  endFret = 15,
}: {
  chord: ChordToneSource;
  previewChord?: ChordToneSource | null;
  rowMode?: "triads" | "sevenths";
  endFret?: number;
}) {
  const controls = useChordShapesState();
  return (
    <ChordShapesView
      chrome={CHROME}
      tuning={TUNINGS.standard}
      selectedKey="F"
      startFret={0}
      endFret={endFret}
      selectedChord={chord}
      previewChord={previewChord}
      chordRowMode={rowMode}
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

const regionLabels = () =>
  screen.getAllByTestId("region-toggle").map((b) => ({
    id: b.getAttribute("data-region-id"),
    on: b.getAttribute("aria-pressed") === "true",
  }));

describe("ChordShapesView — next-chord preview", () => {
  const at = (el: Element) =>
    `${el.getAttribute("data-string")}-${el.getAttribute("data-fret")}`;

  it("rings the next chord's targets, not notes that keep their role", () => {
    render(<Harness chord={F_MAJOR} previewChord={C_MAJOR} />);
    const rings = screen.getAllByTestId("preview-ring");
    const roleNow = new Map(
      screen
        .getAllByTestId("note-marker")
        .map((m) => [at(m), m.getAttribute("data-role")]),
    );
    expect(rings.length).toBeGreaterThan(0);
    expect(rings.some((r) => roleNow.get(at(r)) === r.getAttribute("data-role"))).toBe(
      false,
    );
  });

  it("draws no rings without a chord to preview", () => {
    render(<Harness chord={F_MAJOR} />);
    expect(screen.queryAllByTestId("preview-ring")).toHaveLength(0);
  });
});

describe("ChordShapesView — Inversions", () => {
  it("draws string groups as icons named by their strings", () => {
    render(<Harness chord={F_MAJOR} />);
    const group = screen.getByRole("group", { name: "String groups" });
    expect(
      Array.from(group.querySelectorAll("button")).map((b) =>
        b.getAttribute("aria-label"),
      ),
    ).toEqual([
      "Strings 1-2-3 (high E side)",
      "Strings 2-3-4 (middle strings)",
      "Strings 3-4-5 (middle strings)",
      "Strings 4-5-6 (low E side)",
    ]);
  });

  it("gives each string-group icon a tooltip with its name", () => {
    render(<Harness chord={F_MAJOR} />);
    expect(screen.getAllByRole("tooltip").map((t) => t.textContent)).toEqual(
      expect.arrayContaining([
        "Strings 1-2-3 (high E side)",
        "Strings 4-5-6 (low E side)",
      ]),
    );
  });

  it("names drop-3 groups by the string they skip", async () => {
    render(<Harness chord={F_MAJOR} rowMode="sevenths" />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Voicing system" }),
      "drop3",
    );
    expect(
      screen.getByRole("button", { name: "Strings 6-4-3-2 (skips string 5)" }),
    ).toBeInTheDocument();
  });

  it("explains string groups in the legend", () => {
    render(<Harness chord={F_MAJOR} />);
    expect(screen.getByTestId("legend-stringGroup")).toBeInTheDocument();
  });
});

describe("ChordShapesView — CAGED", () => {
  it("swaps the string-group selectors for shape labels above the board, E and A on", async () => {
    render(<Harness chord={F_MAJOR} />);
    await switchToCaged();
    expect(
      screen.queryByRole("group", { name: "String groups" }),
    ).not.toBeInTheDocument();
    expect(regionLabels()).toEqual([
      { id: "C", on: false },
      { id: "A", on: true },
      { id: "G", on: false },
      { id: "E", on: true },
      { id: "D", on: false },
    ]);
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

  it("toggles a shape from its label", async () => {
    render(<Harness chord={F_MAJOR} />);
    await switchToCaged();
    await userEvent.click(screen.getByRole("button", { name: "C-shape" }));
    expect(regionLabels().find((r) => r.id === "C")?.on).toBe(true);
  });

  it("pins a shape that doesn't fit the fret range so it stays toggleable", async () => {
    render(<Harness chord={F_MAJOR} endFret={5} />);
    await switchToCaged();
    expect(screen.getByRole("button", { name: "G-shape" })).toHaveAttribute(
      "title",
      "G-shape doesn't fit the current fret range",
    );
  });

  it("explains that a diminished triad has no CAGED shapes", async () => {
    render(<Harness chord={E_DIM} />);
    await switchToCaged();
    expect(screen.getByText("No CAGED shapes for this chord.")).toBeInTheDocument();
  });

  it("asks for a shape when every label is off", async () => {
    render(<Harness chord={F_MAJOR} />);
    await switchToCaged();
    await userEvent.click(screen.getByRole("button", { name: "E-shape" }));
    await userEvent.click(screen.getByRole("button", { name: "A-shape" }));
    expect(screen.getByText("Toggle a shape to begin.")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChordMap } from "./ChordMap";
import { ALL_NOTES_KEY } from "../theory/notes";
import { toggleChordRef, type ChordRef, type ChordRowMode } from "../theory/harmony";
import type { Mode } from "../theory/modes";

type HarnessProps = {
  selectedKey?: string;
  modalMode?: Mode;
  rowMode?: ChordRowMode;
};

// Mirrors App's wiring: onSelect toggles the selected ref.
function Harness({
  selectedKey = "C",
  modalMode = "ionian",
  rowMode = "triads",
}: HarnessProps) {
  const [selectedRef, setSelectedRef] = useState<ChordRef | null>(null);
  return (
    <ChordMap
      selectedKey={selectedKey}
      modalMode={modalMode}
      rowMode={rowMode}
      onRowModeChange={() => {}}
      selectedRef={selectedRef}
      onSelect={(ref) => setSelectedRef((prev) => toggleChordRef(prev, ref))}
    />
  );
}

function cardsIn(tier: string): HTMLElement[] {
  return screen
    .getAllByTestId("chord-card")
    .filter((c) => c.getAttribute("data-tier") === tier);
}

function emptyDegreesIn(tier: string): number[] {
  return screen
    .queryAllByTestId("chord-cell-empty")
    .filter((c) => c.getAttribute("data-tier") === tier)
    .map((c) => Number(c.getAttribute("data-degree")));
}

describe("ChordMap", () => {
  it("names the key and mode once, and the borrowing source on its tier", () => {
    render(<Harness modalMode="dorian" />);
    expect(
      screen.getByRole("heading", { name: "Chords in C Dorian" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Secondary dominants")).toBeInTheDocument();
    expect(screen.getByText("Diatonic")).toBeInTheDocument();
    expect(screen.getByText("Borrowed from C Ionian (Major)")).toBeInTheDocument();
  });

  it("shows each chord's notes on its card", () => {
    render(<Harness rowMode="sevenths" />);
    expect(screen.getByRole("button", { name: "V7/ii A7" })).toHaveTextContent(
      "A C# E G",
    );
  });

  it("renders 7 diatonic cards", () => {
    render(<Harness />);
    expect(cardsIn("diatonic")).toHaveLength(7);
  });

  it("leaves secondary cells 1 and 7 empty in C Ionian", () => {
    render(<Harness />);
    expect(emptyDegreesIn("secondary")).toEqual([1, 7]);
  });

  it("leaves borrowed cells 2 and 4 empty in C Dorian", () => {
    render(<Harness modalMode="dorian" />);
    expect(emptyDegreesIn("borrowed")).toEqual([2, 4]);
  });

  it("shows A7 as V7/ii in sevenths mode", () => {
    render(<Harness rowMode="sevenths" />);
    expect(screen.getByRole("button", { name: "V7/ii A7" })).toHaveAttribute(
      "data-degree",
      "2",
    );
  });

  it("selects a card on click", async () => {
    render(<Harness />);
    const card = screen.getByRole("button", { name: "♭VI Ab" });
    await userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("deselects the selected card on a second click", async () => {
    render(<Harness />);
    const card = screen.getByRole("button", { name: "♭VI Ab" });
    await userEvent.click(card);
    await userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps a single card selected across tiers", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "V G" }));
    await userEvent.click(screen.getByRole("button", { name: "V7/V D7" }));
    const pressed = screen
      .getAllByTestId("chord-card")
      .filter((c) => c.getAttribute("aria-pressed") === "true");
    expect(pressed.map((c) => c.getAttribute("aria-label"))).toEqual(["V7/V D7"]);
  });

  it("renders no chord tiers for the All key", () => {
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(screen.queryAllByTestId("chord-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("chord-cell-empty")).toHaveLength(0);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByText("Pick a key to see its chords.")).toBeInTheDocument();
  });
});

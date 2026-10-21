import { describe, it, expect, vi } from "vitest";
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
  onAdd?: (ref: ChordRef) => void;
};

// Mirrors App's wiring: onSelect toggles the selected ref.
function Harness({
  selectedKey = "C",
  modalMode = "ionian",
  rowMode = "triads",
  onAdd,
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
      onAdd={onAdd}
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
  it("labels the three tiers with key and mode", () => {
    render(<Harness modalMode="dorian" />);
    expect(screen.getByText("Secondary dominants")).toBeInTheDocument();
    expect(screen.getByText("Diatonic (C Dorian)")).toBeInTheDocument();
    expect(screen.getByText("Borrowed (C Ionian)")).toBeInTheDocument();
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

  it("shows no ＋ buttons without onAdd", () => {
    render(<Harness />);
    expect(screen.queryAllByRole("button", { name: /to progression/ })).toHaveLength(0);
  });

  it("shows one ＋ button per chord with onAdd", () => {
    render(<Harness onAdd={() => {}} />);
    expect(screen.getAllByRole("button", { name: /to progression/ })).toHaveLength(
      screen.getAllByTestId("chord-card").length,
    );
  });

  it("calls onAdd with the chord's ref from its ＋ button", async () => {
    const onAdd = vi.fn();
    render(<Harness rowMode="sevenths" onAdd={onAdd} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add A7 to progression" }),
    );
    expect(onAdd).toHaveBeenCalledWith({ tier: "secondary", degree: 2 });
  });

  it("does not select the card when its ＋ button is clicked", async () => {
    render(<Harness rowMode="sevenths" onAdd={() => {}} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add A7 to progression" }),
    );
    expect(screen.getByRole("button", { name: "V7/ii A7" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders no chord tiers for the All key", () => {
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(screen.queryAllByTestId("chord-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("chord-cell-empty")).toHaveLength(0);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});

describe("ChordMap — progression toggle", () => {
  function renderMap(extra: Partial<Parameters<typeof ChordMap>[0]> = {}) {
    render(
      <ChordMap
        selectedKey="C"
        modalMode="ionian"
        rowMode="triads"
        onRowModeChange={() => {}}
        selectedRef={null}
        onSelect={() => {}}
        {...extra}
      />,
    );
  }

  it("is absent without onToggleProgression", () => {
    renderMap();
    expect(
      screen.queryByRole("button", { name: "Progression" }),
    ).not.toBeInTheDocument();
  });

  it("reflects visibility with aria-pressed", () => {
    renderMap({ progressionVisible: true, onToggleProgression: () => {} });
    expect(screen.getByRole("button", { name: "Progression" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onToggleProgression", async () => {
    const onToggle = vi.fn();
    renderMap({ progressionVisible: false, onToggleProgression: onToggle });
    await userEvent.click(screen.getByRole("button", { name: "Progression" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps the toggle available under the All key", async () => {
    const onToggle = vi.fn();
    renderMap({
      selectedKey: ALL_NOTES_KEY,
      progressionVisible: false,
      onToggleProgression: onToggle,
    });
    expect(screen.queryAllByTestId("chord-card")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Progression" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

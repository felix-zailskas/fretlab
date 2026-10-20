import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fretboard } from "./Fretboard";
import { TUNINGS } from "../../theory/tuning";
import type { NoteMarker } from "../../theory/types";

describe("Fretboard — string toggle column", () => {
  it("renders 6 string-toggle buttons", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    const toggles = screen.getAllByTestId("string-toggle");
    expect(toggles).toHaveLength(6);
  });

  it("each button has the correct data-string-index", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    const toggles = screen.getAllByTestId("string-toggle");
    const indices = toggles
      .map((t) => parseInt(t.getAttribute("data-string-index") ?? "-1", 10))
      .sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("data-enabled and aria-pressed reflect enabledStrings membership", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4])}
        onToggleString={() => {}}
      />,
    );
    const five = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    expect(five).toBeDefined();
    expect(five).toHaveAttribute("data-enabled", "false");
    expect(five).toHaveAttribute("aria-pressed", "true");

    const zero = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "0");
    expect(zero).toHaveAttribute("data-enabled", "true");
    expect(zero).toHaveAttribute("aria-pressed", "false");
  });

  it("aria-label includes the open-string note from the tuning", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.dadgad}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    // DADGAD: low D, A, D, G, A, D — index 0 is "D"
    const zero = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "0");
    expect(zero).toHaveAttribute("aria-label", expect.stringContaining("D"));
  });

  it("clicking a toggle calls onToggleString with the correct index", async () => {
    const onToggleString = vi.fn();
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={onToggleString}
      />,
    );
    const two = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "2");
    if (!two) throw new Error("toggle not found");
    await userEvent.click(two);
    expect(onToggleString).toHaveBeenCalledWith(2);
  });
});

describe("Fretboard — out-of-key markers", () => {
  const renderMarkers = (markers: NoteMarker[]) =>
    render(
      <Fretboard
        markers={markers}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );

  it("sets data-outside-key on an isOutsideKey marker", () => {
    renderMarkers([
      { string: 1, fret: 4, note: "C#", role: "third", isOutsideKey: true },
    ]);
    expect(screen.getByTestId("note-marker")).toHaveAttribute(
      "data-outside-key",
      "true",
    );
  });

  it("draws the dashed ring for an isOutsideKey marker", () => {
    renderMarkers([
      { string: 1, fret: 4, note: "C#", role: "third", isOutsideKey: true },
    ]);
    expect(screen.getByTestId("outside-key-ring")).toHaveAttribute(
      "stroke-dasharray",
      "3 2",
    );
  });

  it("omits data-outside-key and the ring for an in-key marker", () => {
    renderMarkers([{ string: 1, fret: 3, note: "C", role: "root" }]);
    expect(screen.getByTestId("note-marker")).not.toHaveAttribute("data-outside-key");
    expect(screen.queryByTestId("outside-key-ring")).not.toBeInTheDocument();
  });
});

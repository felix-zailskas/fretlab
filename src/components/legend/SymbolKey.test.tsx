import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SymbolKey } from "./SymbolKey";

describe("SymbolKey", () => {
  it("shows a short name and ties the full explanation to it", () => {
    render(<SymbolKey kind="characteristic" />);
    const entry = screen.getByRole("button", { name: /Characteristic note/ });
    expect(entry).toHaveAccessibleDescription(
      "The note that gives the mode its colour, e.g. the natural 6th in Dorian.",
    );
  });

  it("keeps the explanation in a tooltip, reachable by keyboard focus", () => {
    render(<SymbolKey kind="notPlayed" />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "This string isn't played in the chord shape.",
    );
  });
});

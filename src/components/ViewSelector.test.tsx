import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSelector } from "./ViewSelector";

describe("ViewSelector", () => {
  it("renders all three view tabs", () => {
    render(<ViewSelector selectedView="note-map" onViewChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Note Map" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Scale Positions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chord Shapes" })).toBeInTheDocument();
  });

  it("marks the selected tab with aria-selected=true", () => {
    render(<ViewSelector selectedView="scale-positions" onViewChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Scale Positions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Note Map" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onViewChange with the clicked tab's id", async () => {
    const onViewChange = vi.fn();
    render(<ViewSelector selectedView="note-map" onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Chord Shapes" }));
    expect(onViewChange).toHaveBeenCalledWith("chord-shapes");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScaleTypeToggle, PENTATONIC_UNAVAILABLE_HINT } from "./ScaleTypeToggle";

describe("ScaleTypeToggle", () => {
  it("marks the active scale type with aria-pressed", () => {
    render(<ScaleTypeToggle value="pentatonic" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Pentatonic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Full" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fires onChange with the clicked scale type", async () => {
    const onChange = vi.fn();
    render(<ScaleTypeToggle value="full" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Pentatonic" }));
    expect(onChange).toHaveBeenCalledWith("pentatonic");
  });

  it("disables both buttons and shows the hint when disabled", () => {
    render(<ScaleTypeToggle value="full" onChange={() => {}} disabled />);
    expect(screen.getByRole("button", { name: "Full" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pentatonic" })).toBeDisabled();
    expect(screen.getByTitle(PENTATONIC_UNAVAILABLE_HINT)).toBeInTheDocument();
    expect(PENTATONIC_UNAVAILABLE_HINT).toBe(
      "Pentatonic is available in Ionian (major) and Aeolian (minor)",
    );
  });
});

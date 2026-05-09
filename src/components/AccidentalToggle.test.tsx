import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccidentalToggle } from "./AccidentalToggle";

// AccidentalToggle uses the literal ♭ / ♯ glyphs as the button label and
// puts the descriptive text in the `title` attribute. The accessible name
// is therefore the glyph; queries use text content rather than the title.
describe("AccidentalToggle", () => {
  it("renders both ♭ and ♯ buttons", () => {
    render(<AccidentalToggle accidentalStyle="sharp" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "♭" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "♯" })).toBeInTheDocument();
  });

  it("marks the active style with aria-pressed=true", () => {
    render(<AccidentalToggle accidentalStyle="flat" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "♭" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "♯" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fires onChange with the clicked style", async () => {
    const onChange = vi.fn();
    render(<AccidentalToggle accidentalStyle="sharp" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "♭" }));
    expect(onChange).toHaveBeenCalledWith("flat");
  });
});

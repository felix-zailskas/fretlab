import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TuningSelector } from "./TuningSelector";

describe("TuningSelector", () => {
  it("shows the active tuning in the trigger label", () => {
    render(<TuningSelector tuningId="open-g" onTuningChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Tuning:/ })).toHaveTextContent(
      "Tuning: Open G",
    );
  });

  it("popover is closed by default; opens on trigger click", async () => {
    render(<TuningSelector tuningId="standard" onTuningChange={() => {}} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("listbox", { name: "Tuning" })).toBeInTheDocument();
  });

  it("renders all four tuning category groups when open", async () => {
    render(<TuningSelector tuningId="standard" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    // Group headers are `<div role="presentation">`. Scope queries to that
    // role so option text containing the same words ("Standard" appears in
    // four option labels too) doesn't cause ambiguity.
    const headers = screen.getAllByRole("presentation");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Standard");
    expect(headerTexts).toContain("Open Tunings");
    expect(headerTexts).toContain("Drop Tunings");
    expect(headerTexts).toContain("Modal & Other");
  });

  // jsdom's accessible-name computation concatenates the option's two spans
  // ("Standard" + the string preview) with no whitespace separator, e.g.
  // "StandardE A D G B E". Match that exact form.
  it("renders each preset as an option with its name and string preview", async () => {
    render(<TuningSelector tuningId="standard" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(
      screen.getByRole("option", { name: "StandardE A D G B E" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Open GD G D G B D" }),
    ).toBeInTheDocument();
  });

  it("marks the active tuning's option with aria-selected=true", async () => {
    render(<TuningSelector tuningId="open-g" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("option", { name: "Open GD G D G B D" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "StandardE A D G B E" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("fires onTuningChange with the selected id and closes the popover", async () => {
    const onTuningChange = vi.fn();
    render(<TuningSelector tuningId="standard" onTuningChange={onTuningChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    await userEvent.click(screen.getByRole("option", { name: "DADGADD A D G A D" }));
    expect(onTuningChange).toHaveBeenCalledWith("dadgad");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the popover on Escape", async () => {
    render(<TuningSelector tuningId="standard" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

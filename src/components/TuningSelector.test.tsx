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
    // Headers are visual `<div>`s — assert presence by text, not role.
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Open Tunings")).toBeInTheDocument();
    expect(screen.getByText("Drop Tunings")).toBeInTheDocument();
    expect(screen.getByText("Modal & Other")).toBeInTheDocument();
  });

  it("renders each preset as an option with its name and string preview", async () => {
    render(<TuningSelector tuningId="standard" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    const standardOption = screen.getByRole("option", { name: /Standard E A D G B E/ });
    expect(standardOption).toBeInTheDocument();
    const openG = screen.getByRole("option", { name: /Open G D G D G B D/ });
    expect(openG).toBeInTheDocument();
  });

  it("marks the active tuning's option with aria-selected=true", async () => {
    render(<TuningSelector tuningId="open-g" onTuningChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("option", { name: /Open G/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: /Standard E A D G B E/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("fires onTuningChange with the selected id and closes the popover", async () => {
    const onTuningChange = vi.fn();
    render(<TuningSelector tuningId="standard" onTuningChange={onTuningChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    await userEvent.click(screen.getByRole("option", { name: /DADGAD/ }));
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

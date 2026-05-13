import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TuningSelector } from "./TuningSelector";
import type { CustomTuning } from "../theory/tuning";

describe("TuningSelector", () => {
  it("shows the active tuning in the trigger label", () => {
    render(
      <TuningSelector
        tuningId="open-g"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Tuning:/ })).toHaveTextContent(
      "Tuning: Open G",
    );
  });

  it("popover is closed by default; opens on trigger click", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("listbox", { name: "Tuning" })).toBeInTheDocument();
  });

  it("renders all four tuning category groups when open", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
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
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(
      screen.getByRole("option", { name: "StandardE A D G B E" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Open GD G D G B D" }),
    ).toBeInTheDocument();
  });

  it("marks the active tuning's option with aria-selected=true", async () => {
    render(
      <TuningSelector
        tuningId="open-g"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
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
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={onTuningChange}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    await userEvent.click(screen.getByRole("option", { name: "DADGADD A D G A D" }));
    expect(onTuningChange).toHaveBeenCalledWith("dadgad");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the popover on Escape", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

const SAMPLE_CUSTOM: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("TuningSelector — custom tunings", () => {
  it("hides the Custom group header when customs is empty", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    const headers = screen.getAllByRole("presentation");
    expect(headers.map((h) => h.textContent)).not.toContain("Custom");
  });

  it("shows the Custom group when customs are present", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    const headers = screen.getAllByRole("presentation");
    expect(headers.map((h) => h.textContent)).toContain("Custom");
    expect(screen.getByRole("option", { name: /My DADGAD/ })).toBeInTheDocument();
  });

  it("renders the '+ New custom tuning…' sentinel and routes to onOpenCreateModal", async () => {
    const onTuningChange = vi.fn();
    const onOpenCreateModal = vi.fn();
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={onTuningChange}
        onOpenCreateModal={onOpenCreateModal}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    await userEvent.click(
      screen.getByRole("option", { name: /New custom tuning/ }),
    );
    expect(onOpenCreateModal).toHaveBeenCalledOnce();
    expect(onTuningChange).not.toHaveBeenCalled();
  });

  it("displays the active custom tuning's name in the trigger label", () => {
    render(
      <TuningSelector
        tuningId={SAMPLE_CUSTOM.id}
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Tuning:/ })).toHaveTextContent(
      "Tuning: My DADGAD",
    );
  });

  it("Edit button is disabled when the active tuning is a preset", () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Edit tuning/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("Edit button is enabled when the active tuning is a custom", async () => {
    const onOpenEditModal = vi.fn();
    render(
      <TuningSelector
        tuningId={SAMPLE_CUSTOM.id}
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={onOpenEditModal}
      />,
    );
    const editBtn = screen.getByRole("button", { name: /Edit tuning/ });
    expect(editBtn).not.toHaveAttribute("aria-disabled", "true");
    await userEvent.click(editBtn);
    expect(onOpenEditModal).toHaveBeenCalledWith(SAMPLE_CUSTOM.id);
  });
});

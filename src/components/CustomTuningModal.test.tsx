import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomTuningModal } from "./CustomTuningModal";
import type { CustomTuning } from "../theory/tuning";

// Restore real timers after each test so fake timers don't leak into
// subsequent tests when a fake-timer test times out before calling
// vi.useRealTimers() itself.
afterEach(() => {
  vi.useRealTimers();
});

const EXISTING: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("CustomTuningModal — create mode", () => {
  it("uses standard strings and an auto-numbered name when initial.strings is the default", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Custom 1");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Custom 1", ["E", "A", "D", "G", "B", "E"]);
  });

  it("does not show a Delete button in create mode", () => {
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("does not show a Save as copy button in create mode", () => {
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Save as copy/ }),
    ).not.toBeInTheDocument();
  });
});

describe("CustomTuningModal — edit mode", () => {
  it("populates the form from initial values and saves the edited values", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("My DADGAD");
    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Renamed", EXISTING.strings);
  });

  it("shows a Save as copy button that fires onSaveCopy with current values", async () => {
    const onSaveCopy = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={onSaveCopy}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Save as copy/ }));
    expect(onSaveCopy).toHaveBeenCalledWith(EXISTING.name, EXISTING.strings);
  });

  it("Delete is two-stage: first click arms, second click within 3s fires onDelete", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onDelete = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={onDelete}
        onCancel={() => {}}
      />,
    );
    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    act(() => {
      fireEvent.click(deleteBtn);
    });
    expect(
      screen.getByRole("button", { name: /Click again to confirm/ }),
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Click again to confirm/ }));
    });
    expect(onDelete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("Delete reverts label after 3s if not confirmed", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onDelete = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={onDelete}
        onCancel={() => {}}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    expect(
      screen.getByRole("button", { name: /Click again to confirm/ }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("CustomTuningModal — keyboard and backdrop", () => {
  it("Esc fires onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Backdrop click fires onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Enter on the name field fires onSave", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    screen.getByLabelText("Name").focus();
    await userEvent.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledOnce();
  });
});

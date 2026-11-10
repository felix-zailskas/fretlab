import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Legend, type DisabledRoles } from "./Legend";
import type { HighlightableRole } from "../theory/types";

const ALL_ROLES = new Set<HighlightableRole>(["root", "third", "fifth", "seventh"]);
const NO_SEVENTH: DisabledRoles = new Map([["seventh", "Triads have no 7th."]]);
const noop = () => {};

describe("Legend", () => {
  it("renders four role buttons", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /Root/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3rd/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5th/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /7th/ })).toBeInTheDocument();
  });

  it("marks a disabled role's button aria-disabled", () => {
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={noop}
        disabledRoles={NO_SEVENTH}
      />,
    );
    expect(screen.getByRole("button", { name: /7th/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("explains why a role is disabled in a tooltip", () => {
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={noop}
        disabledRoles={NO_SEVENTH}
      />,
    );
    expect(screen.getByRole("button", { name: /7th/ })).toHaveAccessibleDescription(
      "Triads have no 7th.",
    );
  });

  it("does not disable the 7th button when disabledRoles is undefined", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /7th/ })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("does not call onToggleRole when a disabled button is clicked", async () => {
    const onToggleRole = vi.fn();
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={onToggleRole}
        disabledRoles={NO_SEVENTH}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /7th/ }));
    expect(onToggleRole).not.toHaveBeenCalled();
  });
});

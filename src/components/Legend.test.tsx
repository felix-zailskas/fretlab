import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Legend } from "./Legend";
import type { HighlightableRole } from "./Legend";

const ALL_ROLES = new Set<HighlightableRole>(["root", "third", "fifth", "seventh"]);
const noop = () => {};

describe("Legend", () => {
  it("renders four role buttons", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /Root/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3rd/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5th/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /7th/ })).toBeInTheDocument();
  });

  it("disables the 7th button when disabledRoles contains 'seventh'", () => {
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={noop}
        disabledRoles={new Set<HighlightableRole>(["seventh"])}
      />,
    );
    expect(screen.getByRole("button", { name: /7th/ })).toBeDisabled();
  });

  it("does not disable the 7th button when disabledRoles is undefined", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /7th/ })).not.toBeDisabled();
  });

  it("does not call onToggleRole when a disabled button is clicked", async () => {
    const onToggleRole = vi.fn();
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={onToggleRole}
        disabledRoles={new Set<HighlightableRole>(["seventh"])}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /7th/ }));
    expect(onToggleRole).not.toHaveBeenCalled();
  });
});

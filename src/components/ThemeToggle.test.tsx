import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders the dark label when mode is 'dark'", () => {
    render(<ThemeToggle mode="dark" onCycle={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("Dark");
  });

  it("renders the light label when mode is 'light'", () => {
    render(<ThemeToggle mode="light" onCycle={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("Light");
  });

  it("calls onCycle when clicked", async () => {
    const onCycle = vi.fn();
    render(<ThemeToggle mode="auto" onCycle={onCycle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onCycle).toHaveBeenCalledTimes(1);
  });
});

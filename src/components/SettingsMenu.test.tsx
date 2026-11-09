import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsMenu, SettingsRow } from "./SettingsMenu";

function renderMenu() {
  render(
    <SettingsMenu summary="Standard · 0–15">
      <SettingsRow label="Frets">
        <button type="button">Inner</button>
      </SettingsRow>
    </SettingsMenu>,
  );
  return screen.getByRole("button", { name: "Settings: Standard · 0–15" });
}

describe("SettingsMenu", () => {
  it("shows the current tuning and fret range on the trigger", () => {
    expect(renderMenu()).toHaveTextContent("Standard · 0–15");
  });

  it("opens and closes the panel", async () => {
    const trigger = renderMenu();
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(trigger);
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const trigger = renderMenu();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    const trigger = renderMenu();
    await userEvent.click(trigger);
    await userEvent.click(document.body);
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("stays open while interacting inside", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /Settings/ }));
    await userEvent.click(screen.getByRole("button", { name: "Inner" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });
});

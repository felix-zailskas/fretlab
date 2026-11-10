import { test, expect, type Page } from "@playwright/test";

// Scale Positions → Pentatonic switch. Default key is C Ionian, so the
// pentatonic is C major pentatonic (no F, no B).
const marker = (page: Page, note: string) =>
  page.locator(`[data-testid="note-marker"][data-note="${note}"]`);

test.describe("pentatonic switch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Scale Positions" }).click();
  });

  test("C Ionian pentatonic hides F and B", async ({ page }) => {
    await expect(marker(page, "F").first()).toBeVisible();
    await page.getByRole("button", { name: "Pentatonic" }).click();
    await expect(marker(page, "F")).toHaveCount(0);
    await expect(marker(page, "B")).toHaveCount(0);
    await expect(marker(page, "C").first()).toBeVisible();
    await expect(page.getByText("Not in pentatonic")).toBeVisible();
  });

  test("G7 keeps B and F as hollow chord tones", async ({ page }) => {
    await page.getByRole("button", { name: "Pentatonic" }).click();
    await page.getByRole("radio", { name: "Sevenths" }).click();
    await page
      .locator('[data-testid="chord-card"][data-tier="diatonic"]')
      .filter({ hasText: "G7" })
      .click();

    for (const note of ["F", "B"]) {
      const markers = marker(page, note);
      await expect(markers.first()).toBeVisible();
      const flags = await markers.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-non-pentatonic")),
      );
      expect(flags.every((f) => f === "true")).toBe(true);
    }
  });

  test("Dorian disables the switch and resets it to Full", async ({ page }) => {
    await page.getByRole("button", { name: "Pentatonic" }).click();
    await page.getByRole("combobox", { name: "Mode" }).selectOption("dorian");

    await expect(page.getByRole("button", { name: "Pentatonic" })).toBeDisabled();
    await expect(marker(page, "F").first()).toBeVisible();

    await page.getByRole("combobox", { name: "Mode" }).selectOption("ionian");
    await expect(page.getByRole("button", { name: "Full" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(marker(page, "F").first()).toBeVisible();
  });
});

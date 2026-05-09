import { test, expect } from "@playwright/test";

// Baseline structural assertions on the default load. These do NOT depend on
// any post-open-tunings additions; they run against whatever's on main.
test.describe("page loads", () => {
  test("renders header, view tabs, and a fretboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Fretlab" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Note Map" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Scale Positions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chord Shapes" })).toBeVisible();
    // Fretboard is an SVG with note markers; at least one should render on load.
    await expect(page.locator('[data-testid="note-marker"]').first()).toBeVisible();
  });

  test("clicking Scale Positions selects that tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Scale Positions" }).click();
    await expect(page.getByRole("tab", { name: "Scale Positions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("low-E string at fret 0 renders the open-string note (standard tuning)", async ({
    page,
  }) => {
    await page.goto("/");
    // String 0 in the codebase = low E (low-pitch first). Default tuning is
    // standard. The fret-0 marker on string 0 should be E.
    const lowE = page.locator(
      '[data-testid="note-marker"][data-string="0"][data-fret="0"]',
    );
    await expect(lowE).toHaveAttribute("data-note", "E");
  });
});

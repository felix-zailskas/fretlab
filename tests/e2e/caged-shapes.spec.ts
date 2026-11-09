import { test, expect } from "@playwright/test";

// CAGED grips in Chord Shapes: the F barre the original report couldn't find.
test.describe("CAGED chord shapes", () => {
  test("F major shows the E-shape barre at fret 1", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "F", exact: true }).click();
    // The I chord is selected by default; clicking it would deselect it.
    await expect(
      page.getByRole("button", { name: "I F", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("tab", { name: "Chord Shapes" }).click();
    await page.getByRole("radio", { name: "CAGED" }).click();

    await expect(page.locator('[data-testid="barre"][data-fret="1"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="position-window"][data-label="E-shape"]').first(),
    ).toBeAttached();
    await expect(
      page.locator(
        '[data-testid="note-marker"][data-string="0"][data-fret="1"][data-note="F"]',
      ),
    ).toBeVisible();
  });

  test("C major C-shape shows the open C chord with a muted low E", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "I C", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("tab", { name: "Chord Shapes" }).click();
    await page.getByRole("radio", { name: "CAGED" }).click();
    await page
      .getByRole("group", { name: "CAGED shapes" })
      .getByRole("button", { name: "C", exact: true })
      .click();

    await expect(
      page.locator('[data-testid="unplayed-string"][data-string="0"][data-fret="0"]'),
    ).toBeAttached();
  });
});

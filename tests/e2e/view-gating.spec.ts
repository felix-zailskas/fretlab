import { test, expect } from "@playwright/test";

test.describe("view gating — non-CAGED tunings", () => {
  test("Open G + Scale Positions shows the empty state, not the fretboard", async ({
    page,
  }) => {
    await page.goto("/");

    // Switch to Open G — use .first() to disambiguate from "Open Gm"
    await page.getByRole("button", { name: /Tuning: Standard/ }).click();
    await page.getByRole("option", { name: /Open G/ }).first().click();

    // Navigate to Scale Positions
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Empty-state button is present
    await expect(
      page.getByRole("button", { name: "Switch to Standard tuning" }),
    ).toBeVisible();

    // No position windows rendered
    const windowCount = await page
      .locator('[data-testid="position-window"]')
      .count();
    expect(windowCount).toBe(0);
  });

  test('"Switch to Standard tuning" button restores the view', async ({ page }) => {
    await page.goto("/");

    // Switch to Open G — use .first() to disambiguate from "Open Gm"
    await page.getByRole("button", { name: /Tuning: Standard/ }).click();
    await page.getByRole("option", { name: /Open G/ }).first().click();

    // Navigate to Scale Positions
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Click the recovery button
    await page.getByRole("button", { name: "Switch to Standard tuning" }).click();

    // Trigger label back to Standard
    await expect(
      page.getByRole("button", { name: /Tuning: Standard/ }),
    ).toBeVisible();

    // Still on Scale Positions tab
    await expect(page.getByRole("tab", { name: "Scale Positions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

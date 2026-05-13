import { test, expect } from "@playwright/test";

test.describe("string toggle", () => {
  test("muting a string demotes its markers; switching views preserves state; re-toggling restores", async ({
    page,
  }) => {
    await page.goto("/");

    // Switch to Scale Positions (tab)
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Pre-toggle: at least one marker on string 5 has a non-muted role
    const stringFiveMarkers = page.locator(
      '[data-testid="note-marker"][data-string="5"]',
    );
    const initialCount = await stringFiveMarkers.count();
    expect(initialCount).toBeGreaterThan(0);

    const nonMutedBefore = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedBefore).toBeGreaterThan(0);

    // Click string 5's toggle
    await page.locator('[data-testid="string-toggle"][data-string-index="5"]').click();

    // After toggle: every string-5 marker is muted
    const nonMutedAfter = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedAfter).toBe(0);

    // Switch to Note Map — toggle state survives
    await page.getByRole("tab", { name: "Note Map" }).click();
    await expect(
      page.locator('[data-testid="string-toggle"][data-string-index="5"]'),
    ).toHaveAttribute("data-enabled", "false");

    // Re-enable: click the toggle again
    await page.locator('[data-testid="string-toggle"][data-string-index="5"]').click();
    await expect(
      page.locator('[data-testid="string-toggle"][data-string-index="5"]'),
    ).toHaveAttribute("data-enabled", "true");

    // Switch back to Scale Positions, confirm markers are no longer muted
    await page.getByRole("tab", { name: "Scale Positions" }).click();
    const nonMutedRestored = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedRestored).toBeGreaterThan(0);
  });
});

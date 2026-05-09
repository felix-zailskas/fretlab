import { test, expect } from "@playwright/test";

// Regression tests for the bug where getPositionWindows ignored the active
// tuning entirely — the position windows were always computed for standard
// tuning regardless of what the user had selected.

test.describe("position-window tuning offset", () => {
  test("C major P2 (A shape) anchors at frets 5-8 in C# Standard", async ({ page }) => {
    await page.goto("/");

    // Select C# Standard
    await page.getByRole("button", { name: /Tuning: Standard/ }).click();
    await page.getByRole("option", { name: /C# Standard/ }).click();

    // Navigate to Scale Positions
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Enable P2 (default is P1 only)
    await page.locator('button[title^="P2-shape"]').click();

    // P2 window for C major in C# Standard should be frets 5-8
    const window = page.locator(
      '[data-testid="position-window"][data-window-id^="P2-"]',
    );
    await expect(window.first()).toHaveAttribute("data-low", "5");
    await expect(window.first()).toHaveAttribute("data-high", "8");
  });

  test("C major P2 (A shape) anchors at frets 2-5 in Standard tuning", async ({
    page,
  }) => {
    await page.goto("/");

    // Standard tuning is the default — no need to switch

    // Navigate to Scale Positions
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Enable P2
    await page.locator('button[title^="P2-shape"]').click();

    // P2 window for C major in Standard should be frets 2-5
    const window = page.locator(
      '[data-testid="position-window"][data-window-id^="P2-"]',
    );
    await expect(window.first()).toHaveAttribute("data-low", "2");
    await expect(window.first()).toHaveAttribute("data-high", "5");
  });

  test("C major P2 (A shape) anchors at frets 4-7 in D Standard", async ({ page }) => {
    await page.goto("/");

    // Select D Standard
    await page.getByRole("button", { name: /Tuning: Standard/ }).click();
    await page.getByRole("option", { name: /D Standard/ }).click();

    // Navigate to Scale Positions
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Enable P2
    await page.locator('button[title^="P2-shape"]').click();

    // P2 window for C major in D Standard should be frets 4-7
    const window = page.locator(
      '[data-testid="position-window"][data-window-id^="P2-"]',
    );
    await expect(window.first()).toHaveAttribute("data-low", "4");
    await expect(window.first()).toHaveAttribute("data-high", "7");
  });
});

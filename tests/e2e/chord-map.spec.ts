import { test, expect } from "@playwright/test";

// Chord map: out-of-key chords drive the fretboard, and the borrowed row
// follows the mode. Default key is C Ionian.
test.describe("chord map", () => {
  test("A7 (V7/ii) in C marks C# outside the key and hides C natural", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Sevenths" }).click();
    await page.getByRole("button", { name: "V7/ii A7" }).click();

    await expect(
      page
        .locator('[data-testid="note-marker"][data-note="C#"][data-outside-key]')
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="note-marker"][data-note="C"]'),
    ).toHaveCount(0);
  });

  test("A7 drives the Chord Shapes view with a C# third", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Sevenths" }).click();
    await page.getByRole("button", { name: "V7/ii A7" }).click();
    await page.getByRole("tab", { name: "Chord Shapes" }).click();

    await expect(
      page
        .locator('[data-testid="note-marker"][data-note="C#"][data-outside-key]')
        .first(),
    ).toBeVisible();
  });

  test("switching to Dorian shows Ionian chords in the borrowed row", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Dorian" }).click();

    await expect(page.getByText("Borrowed (C Ionian)")).toBeVisible();
    const borrowed = page.locator('[data-testid="chord-card"][data-tier="borrowed"]');
    await expect(borrowed).toHaveCount(5);
    const labels = await borrowed.evaluateAll((els) =>
      els.map((el) => el.getAttribute("aria-label")),
    );
    expect(labels).toEqual(["I C", "iii Em", "V G", "vi Am", "vii° B°"]);
  });
});

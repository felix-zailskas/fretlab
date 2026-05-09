import { test, expect } from "@playwright/test";

// Parameterized over several tunings to verify that open-string note labels
// (fret 0) match each tuning's string definitions. Uses the "All Notes" key
// to disable in-key filtering so every open-string marker is guaranteed to
// render regardless of the active key/scale.

// Each option in the listbox renders as "<TuningName> <string notes>" (the
// accessible name is the full button text). We use a non-anchored name match
// so "D Standard" matches "D Standard D G C F A D".
// "Open G" also matches "Open Gm", so we append the expected open strings to
// the name match for disambiguation.
const cases = [
  {
    tuningName: "Standard",
    namePattern: /^Standard\s/,
    openStrings: ["E", "A", "D", "G", "B", "E"],
  },
  {
    tuningName: "D Standard",
    namePattern: /^D Standard\s/,
    openStrings: ["D", "G", "C", "F", "A", "D"],
  },
  {
    tuningName: "Open G",
    // Disambiguate from "Open Gm D G D G A# D"
    namePattern: /^Open G\s/,
    openStrings: ["D", "G", "D", "G", "B", "D"],
  },
  {
    tuningName: "Drop D",
    namePattern: /^Drop D\s/,
    openStrings: ["D", "A", "D", "G", "B", "E"],
  },
  {
    tuningName: "DADGAD",
    namePattern: /^DADGAD\s/,
    openStrings: ["D", "A", "D", "G", "A", "D"],
  },
];

for (const { tuningName, namePattern, openStrings } of cases) {
  test(`open-string notes match tuning: ${tuningName}`, async ({ page }) => {
    await page.goto("/");

    // Open the tuning selector and pick the target tuning. The option's
    // accessible name is "<TuningName> <string notes>", so we match on a
    // pattern anchored at the start.
    await page.getByRole("button", { name: /Tuning:/ }).click();
    await page.getByRole("option", { name: namePattern }).first().click();

    // Select "All Notes" key to disable in-key filtering
    await page.getByRole("button", { name: "All" }).click();

    // Verify each open-string note
    for (let stringIdx = 0; stringIdx < openStrings.length; stringIdx++) {
      const marker = page.locator(
        `[data-testid="note-marker"][data-string="${stringIdx}"][data-fret="0"]`,
      );
      await expect(marker).toHaveAttribute("data-note", openStrings[stringIdx]);
    }
  });
}

import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  selectKey,
  outDir,
  STEP,
  SHORT,
  HOLD,
} from "./_lib.mjs";

// Stays on Note Map throughout — that's the view that actually works in every
// tuning. Showcases the grouped selector (in the Settings popover) and how the
// open-string notes and in-key labels shift across step-down standards, open
// tunings, drop tunings, and modal tunings.
//
// Key is set to G major so the in-key tones (G/B/D) light up as roots/thirds/
// fifths in the tunings whose open strings include them — Standard, Open G,
// Drop D, DADGAD, etc. — making each tuning's character visually distinct.
export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Switch to G major so open strings produce visible chord-tone color in
  // most of the cycled tunings. I (G major triad) stays selected by default.
  await selectKey(page, "G");
  await page.waitForTimeout(HOLD);

  // Each pickTuning() opens Settings and the tuning popover (showing the
  // grouped categories), clicks an option, then closes Settings so the board
  // is unobstructed for the hold.
  async function pickTuning(optionMatcher) {
    await page.getByRole("button", { name: /^Settings/ }).click();
    await page.waitForTimeout(SHORT);
    await page.getByRole("button", { name: /Tuning:/ }).click();
    await page.waitForTimeout(STEP);
    await page.getByRole("option", { name: optionMatcher }).first().click();
    await page.waitForTimeout(SHORT);
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(HOLD);
  }

  // Cycle across categories. /^Open G/ would also match Open Gm — using the
  // full string-preview form to disambiguate. /^DADGAD/ is unique.
  await pickTuning(/^D Standard/); // step-down: every string -2 semitones
  await pickTuning("Open G D G D G B D"); // open: G chord on open strings
  await pickTuning("Drop D D A D G B E"); // drop: only low string changes
  await pickTuning(/^DADGAD/); // modal: D-A-D-G-A-D
  // pickTuning's own HOLD is the loop's tail — no extra wait needed.

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "tunings.gif"), (Date.now() - start) / 1000);
  console.log("✓ tunings.gif");
}

import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  chordRowMode,
  voicingSystem,
  stringGroups,
  inversions,
  outDir,
  STEP,
  HOLD,
  TAB_SWITCH_TRIM_HEAD,
} from "./_lib.mjs";

export async function record(browser) {
  const start = Date.now();
  // The view's controls now live below the fretboard, so the standard
  // 1440x900 viewport fits everything without clipping.
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Switch to Chord Shapes tab. Default state: Triads mode, 1-2-3 string-set,
  // all 3 triad inversions selected → shapes render immediately.
  await page.getByRole("tab", { name: "Chord Shapes" }).click();
  await page.waitForTimeout(HOLD);

  // Switch to 7ths mode via the chord-row toggle (drives the Chord Shapes
  // view's mode now that ShapeHeader is gone). Defaults carry over: low
  // position (3-4-5-6 in close voicing) and Root inversion — board stays
  // populated.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(HOLD);

  // Cycle voicing systems with Root inversion + low position kept ON the whole
  // time, so each system renders the Cmaj7 root voicing in its own shape.
  // Exact match — "Drop 2" is a substring of "Drop 2&4".
  for (const sys of ["Drop 2", "Drop 3", "Drop 2&4"]) {
    await voicingSystem(page).getByRole("radio", { name: sys, exact: true }).click();
    await page.waitForTimeout(HOLD);
  }
  // Back to Close for the next steps.
  await voicingSystem(page).getByRole("radio", { name: "Close", exact: true }).click();
  await page.waitForTimeout(STEP);

  // Add 1st Inversion alongside Root — two voicings now stacked on low.
  await inversions(page).getByRole("button", { name: "1st Inversion" }).click();
  await page.waitForTimeout(HOLD);

  // Add the mid string-set (2-3-4-5 in close voicing) — Root + 1st rendered
  // on both low and mid, populating more of the neck.
  await stringGroups(page).getByRole("button", { name: "2-3-4-5" }).click();
  await page.waitForTimeout(HOLD);

  // Switch back to Triads via the chord-row toggle — voicing selector hides,
  // string-sets become 1-2-3 / 2-3-4 / 3-4-5 / 4-5-6, and the triad-side
  // state (1-2-3 + all 3 inversions) takes over so shapes are still on screen.
  await chordRowMode(page).getByRole("radio", { name: "Triads" }).click();
  await page.waitForTimeout(HOLD);

  // Add a 2nd triad string-set so shapes ascend the neck.
  await stringGroups(page).getByRole("button", { name: "2-3-4" }).click();
  await page.waitForTimeout(HOLD);

  // Toggle 3rd off in Legend — markers demote to plain scale tones.
  await page.getByRole("button", { name: "3rd", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(
    webm,
    join(outDir, "chord-shapes.gif"),
    (Date.now() - start) / 1000,
    TAB_SWITCH_TRIM_HEAD,
  );
  console.log("✓ chord-shapes.gif");
}

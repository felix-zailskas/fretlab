import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  chordRowMode,
  voicingSystem,
  stringGroups,
  inversions,
  highlightRoles,
  outDir,
  STEP,
  HOLD,
  TAB_SWITCH_TRIM_HEAD,
} from "./_lib.mjs";

export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Switch to Chord Shapes tab. Default state: Inversions, Triads, strings
  // 1-2-3 and all three triad inversions → shapes render immediately.
  await page.getByRole("tab", { name: "Chord Shapes" }).click();
  await page.waitForTimeout(HOLD);

  // Add a second string group from its fretboard-slice icon so shapes
  // ascend the neck.
  await stringGroups(page)
    .getByRole("button", { name: "Strings 2-3-4 (middle strings)" })
    .click();
  await page.waitForTimeout(HOLD);

  // Narrow to root position only.
  for (const inv of ["1st", "2nd"]) {
    await inversions(page).getByRole("button", { name: inv, exact: true }).click();
    await page.waitForTimeout(STEP);
  }
  await page.waitForTimeout(STEP);

  // Switch to 7ths via the chord map's toggle. Defaults carry over: low
  // position and Root inversion — the board stays populated.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(HOLD);

  // Cycle voicing systems; each renders the Cmaj7 root voicing in its shape.
  for (const sys of ["drop2", "drop3", "drop2-4"]) {
    await voicingSystem(page).selectOption(sys);
    await page.waitForTimeout(HOLD);
  }
  // Back to Close for the next steps.
  await voicingSystem(page).selectOption("close");
  await page.waitForTimeout(STEP);

  // Add 1st inversion alongside Root — two voicings now stacked.
  await inversions(page).getByRole("button", { name: "1st", exact: true }).click();
  await page.waitForTimeout(HOLD);

  // Back to Triads — the voicing select hides and triad string groups return.
  await chordRowMode(page).getByRole("radio", { name: "Triads" }).click();
  await page.waitForTimeout(HOLD);

  // Toggle 3rd off in the legend — markers demote to plain scale tones.
  await highlightRoles(page).getByRole("button", { name: "3rd", exact: true }).click();
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

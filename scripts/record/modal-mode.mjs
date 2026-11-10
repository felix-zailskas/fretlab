import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  chordRowMode,
  selectKey,
  selectMode,
  inSettings,
  outDir,
  STEP,
  HOLD,
} from "./_lib.mjs";

export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Stay on Note Map (default) — it's the cleanest view to show modal effects.
  // Sevenths mode for the chord map so modal Roman numerals show maj7/m7/etc.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // Cycle modes Ionian → Dorian → Phrygian → Lydian → Mixolydian → Aeolian → Locrian.
  for (const mode of [
    "dorian",
    "phrygian",
    "lydian",
    "mixolydian",
    "aeolian",
    "locrian",
  ]) {
    await selectMode(page, mode);
    await page.waitForTimeout(HOLD);
  }
  // Back to Ionian briefly before the parent-key demo.
  await selectMode(page, "ionian");
  await page.waitForTimeout(STEP);

  // D Lydian — spelling auto-flips to sharps (parent A major).
  await selectKey(page, "D");
  await page.waitForTimeout(STEP);
  await selectMode(page, "lydian");
  await page.waitForTimeout(HOLD);

  // D Phrygian — spelling auto-flips to flats (parent Bb major).
  await selectMode(page, "phrygian");
  await page.waitForTimeout(HOLD);

  // Manual override in Settings: sharps stick until the next key/mode change.
  await inSettings(page, (settings) =>
    settings.locator('button[title="Sharp spelling"]').click(),
  );
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "modal-mode.gif"), (Date.now() - start) / 1000);
  console.log("✓ modal-mode.gif");
}

import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  chordRowMode,
  outDir,
  STEP,
  SHORT,
  HOLD,
} from "./_lib.mjs";

export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Stay on Note Map (default) — it's the cleanest view to show modal effects.
  // Sevenths mode for the chord row so modal Roman numerals show maj7/m7/etc.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // Cycle modes Ionian → Dorian → Phrygian → Lydian → Mixolydian → Aeolian → Locrian.
  // Exact match — "Lydian" is a substring of "Mixolydian".
  const modeRadio = (name) => page.getByRole("radio", { name, exact: true });
  for (const mode of [
    "Dorian",
    "Phrygian",
    "Lydian",
    "Mixolydian",
    "Aeolian",
    "Locrian",
  ]) {
    await modeRadio(mode).click();
    await page.waitForTimeout(HOLD);
  }
  // Back to Ionian briefly before the parent-key demo.
  await modeRadio("Ionian").click();
  await page.waitForTimeout(STEP);

  // Switch to D Lydian — accidental should auto-flip to sharps (parent A major).
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.waitForTimeout(SHORT);
  await modeRadio("Lydian").click();
  await page.waitForTimeout(HOLD);

  // Switch to D Phrygian — accidental should auto-flip to flats (parent Bb major).
  await modeRadio("Phrygian").click();
  await page.waitForTimeout(HOLD);

  // Manual override: click sharp — sticks until next key/mode change.
  await page.locator('button[title="Sharp spelling"]').click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "modal-mode.gif"), (Date.now() - start) / 1000);
  console.log("✓ modal-mode.gif");
}

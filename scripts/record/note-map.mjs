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

  // Sevenths mode for richer chord-tone color set.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // Cycle keys: C → G → D → Eb (flip to flats first for Eb).
  await page.getByRole("button", { name: "G", exact: true }).click();
  await page.waitForTimeout(STEP);
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.waitForTimeout(STEP);
  await page.locator('button[title="Flat spelling"]').click();
  await page.waitForTimeout(SHORT);
  await page.getByRole("button", { name: "Eb", exact: true }).click();
  await page.waitForTimeout(HOLD);

  // Cycle chords I → ii → iii → IV → V → vi → vii° via 1-7 shortcuts.
  for (const k of ["2", "3", "4", "5", "6", "7"]) {
    await page.keyboard.press(k);
    await page.waitForTimeout(STEP);
  }
  // Back to I for legend toggle demo.
  await page.keyboard.press("1");
  await page.waitForTimeout(STEP);

  // Toggle 3rd / 5th / 7th in Legend (off then on).
  for (const role of ["3rd", "5th", "7th"]) {
    const btn = page.getByRole("button", { name: role, exact: true });
    await btn.click();
    await page.waitForTimeout(SHORT);
    await btn.click();
    await page.waitForTimeout(SHORT);
  }
  await page.waitForTimeout(STEP);

  // Sharp → flat already done; flip back so the All Notes view is in the
  // sharp default the README caption assumes.
  await page.locator('button[title="Sharp spelling"]').click();
  await page.waitForTimeout(SHORT);

  // Switch key to All Notes — disables key filtering.
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "note-map.gif"), (Date.now() - start) / 1000);
  console.log("✓ note-map.gif");
}

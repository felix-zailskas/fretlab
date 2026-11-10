import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  outDir,
  STEP,
  HOLD,
  TAB_SWITCH_TRIM_HEAD,
} from "./_lib.mjs";

// Chord Shapes in CAGED mode: full-chord grips placed along the neck, with
// the barre drawn as a bar and unplayed strings marked ×. Starts on F major
// (the E-shape barre at fret 1 that motivated the feature).
export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  await page.getByRole("tab", { name: "Chord Shapes" }).click();
  await page.waitForTimeout(STEP);
  await page.getByRole("radio", { name: "CAGED" }).click();
  await page.waitForTimeout(STEP);

  // F (IV in C) — E and A shapes are on by default; the E-shape barres fret 1.
  await page.keyboard.press("4");
  await page.waitForTimeout(HOLD);

  // Toggle the other shapes on from their labels above the board.
  for (const shape of ["D-shape", "C-shape", "G-shape"]) {
    await page.getByRole("button", { name: shape, exact: true }).click();
    await page.waitForTimeout(HOLD);
  }

  // Pick another chord from the chord map: Am (vi) moves every shape.
  await page.getByRole("button", { name: "vi Am", exact: true }).click();
  await page.waitForTimeout(HOLD);

  // And a secondary dominant: A7 (V7/ii) keeps its 7th as a full dom7 grip.
  await page.getByRole("button", { name: "V7/ii A7", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(
    webm,
    join(outDir, "caged-shapes.gif"),
    (Date.now() - start) / 1000,
    TAB_SWITCH_TRIM_HEAD,
  );
  console.log("✓ caged-shapes.gif");
}

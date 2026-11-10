import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  chordRowMode,
  regionToggle,
  selectKey,
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

  // Switch to Scale Positions tab.
  await page.getByRole("tab", { name: "Scale Positions" }).click();
  await page.waitForTimeout(STEP);

  // Sevenths chord row, default key C, I (Cmaj7) selected.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // P1 is on by default; hold on it, then toggle more positions from their
  // labels above the board.
  await page.waitForTimeout(HOLD);

  // P2 — overlap zone appears.
  await regionToggle(page, "P2").click();
  await page.waitForTimeout(HOLD);

  // P3 — three boxes, two overlap zones.
  await regionToggle(page, "P3").click();
  await page.waitForTimeout(HOLD);

  // Deselect I — markers shift to plain scale tones (no chord context).
  await page.keyboard.press("1");
  await page.waitForTimeout(HOLD);

  // Re-select I for the next steps.
  await page.keyboard.press("1");
  await page.waitForTimeout(STEP);

  // Switch key to G — boxes shift up the neck.
  await selectKey(page, "G");
  await page.waitForTimeout(HOLD);

  // Context notes — out-of-position in-key notes appear muted.
  await page.getByLabel("Context notes").check();
  await page.waitForTimeout(HOLD);

  // Pentatonic — the 4th and 7th drop out; chord tones outside the
  // pentatonic stay as hollow markers.
  await page
    .getByRole("group", { name: "Scale" })
    .getByRole("button", { name: "Pentatonic" })
    .click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(
    webm,
    join(outDir, "scale-positions.gif"),
    (Date.now() - start) / 1000,
    TAB_SWITCH_TRIM_HEAD,
  );
  console.log("✓ scale-positions.gif");
}

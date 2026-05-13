import { join } from "node:path";
import { newDarkContext, loadApp, outDir, STEP } from "./_lib.mjs";

// Captures the Scale Positions view with strings 5 (high E) and 4 (B) muted
// via the eye column. The remaining four strings show normal chord-tone
// coloring; the muted strings show dimmed scale markers — the visual contract
// the string-toggle feature ships.
export async function record(browser) {
  const context = await newDarkContext(browser, false);
  const page = await context.newPage();
  await loadApp(page);

  // Switch to Scale Positions so we have a clearly-bracketed in-window view.
  await page.getByRole("tab", { name: "Scale Positions" }).click();
  await page.waitForTimeout(STEP);

  // Mute the top two strings (index 5 = high E, index 4 = B). The eye column
  // is the left strip of the fretboard.
  await page.locator('[data-testid="string-toggle"][data-string-index="5"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-testid="string-toggle"][data-string-index="4"]').click();
  await page.waitForTimeout(STEP);

  await page.screenshot({
    path: join(outDir, "string-toggle.png"),
    fullPage: false,
  });
  await context.close();
  console.log("✓ string-toggle.png");
}

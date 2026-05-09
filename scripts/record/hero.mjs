import { join } from "node:path";
import { newDarkContext, loadApp, chordRowMode, outDir } from "./_lib.mjs";

export async function record(browser) {
  const context = await newDarkContext(browser, false);
  const page = await context.newPage();
  await loadApp(page);
  // Default state already matches the hero caption: Note Map, C major, I
  // selected, Triads. README caption says "Cmaj7" — switch chord row to
  // Sevenths so the I chord renders as the maj7 voicing.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, "hero.png"),
    fullPage: false,
  });
  await context.close();
  console.log("✓ hero.png");
}

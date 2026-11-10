import { join } from "node:path";
import { newDarkContext, loadApp, chordRowMode, addChords, outDir } from "./_lib.mjs";

export async function record(browser) {
  const context = await newDarkContext(browser, false);
  const page = await context.newPage();
  await loadApp(page);
  // Note Map, C Ionian, I selected by default. Sevenths so the I chord renders
  // as Cmaj7, and a short progression so the lane under the header shows.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await addChords(page, ["Cmaj7", "Am7", "Fmaj7", "G7"]);
  // Closing the picker returns focus to its trigger; drop the focus ring.
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, "hero.png"),
    fullPage: false,
  });
  await context.close();
  console.log("✓ hero.png");
}

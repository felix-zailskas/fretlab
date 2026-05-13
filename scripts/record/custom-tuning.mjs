import { join } from "node:path";
import { newDarkContext, loadApp, outDir } from "./_lib.mjs";

// Opens the custom-tuning modal in create mode and captures it sitting over
// the app. The screenshot shows the name field, the 6 string pickers, and
// the action row (Cancel / Save) so the README can refer to the modal
// without recording a full interaction.
export async function record(browser) {
  const context = await newDarkContext(browser, false);
  const page = await context.newPage();
  await loadApp(page);

  // Open the tuning popover, then the "+ New custom tuning…" sentinel.
  await page.getByRole("button", { name: /Tuning:/ }).click();
  await page.waitForTimeout(250);
  await page.getByRole("option", { name: /New custom tuning/ }).click();

  // Wait for the modal dialog to be visible and scope queries to it — the
  // app's string-toggle buttons share an aria-label prefix with the modal's
  // string pickers, so unscoped queries are ambiguous.
  const dialog = page.getByRole("dialog", { name: "Custom tuning" });
  await dialog.waitFor();
  await page.waitForTimeout(300);

  // Type a name so the modal isn't showing the placeholder "Custom 1".
  const nameInput = dialog.getByLabel("Name");
  await nameInput.fill("");
  await nameInput.type("My DADGAD", { delay: 25 });

  // Set strings to D A D G A D so the picker row is recognizable.
  const strings = ["D", "A", "D", "G", "A", "D"];
  for (let i = 0; i < strings.length; i++) {
    await dialog
      .getByLabel(`String ${i + 1}`, { exact: true })
      .selectOption(strings[i]);
  }
  await page.waitForTimeout(400);

  await page.screenshot({
    path: join(outDir, "custom-tuning.png"),
    fullPage: false,
  });
  await context.close();
  console.log("✓ custom-tuning.png");
}

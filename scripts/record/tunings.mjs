import { join } from "node:path";
import { newDarkContext, loadApp, toGif, outDir, STEP, HOLD } from "./_lib.mjs";

// Demonstrates the three things that matter about the tuning system:
//   1. The grouped selector (Standard / Open / Drop / Modal).
//   2. CAGED-compatible step-down tunings shift boxes & notes correctly
//      (D Standard is +2 semitones from standard).
//   3. Non-CAGED tunings gate Scale Positions / Chord Shapes via the
//      empty-state component, with a "Switch to Standard" escape button.
export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Hold a moment on the default Standard / Note Map state so the loop point
  // is unambiguous when the GIF restarts.
  await page.waitForTimeout(STEP);

  const tuningTrigger = page.getByRole("button", { name: /Tuning:/ });

  // Open the tuning selector — show the grouped popover.
  await tuningTrigger.click();
  await page.waitForTimeout(HOLD);

  // Pick D Standard (CAGED-compatible). Note labels on Note Map shift down
  // by 2 semitones on every string — same in-key notes, new fretboard
  // anchors. Anchor the regex with ^ so it doesn't match "C# Standard" or
  // "Eb Standard" via partial overlap.
  await page.getByRole("option", { name: /^D Standard/ }).click();
  await page.waitForTimeout(HOLD);

  // Switch to Scale Positions to show the box-window shift. P1 was at
  // [0,3] in standard; in D Standard it's at [2,5].
  await page.getByRole("tab", { name: "Scale Positions" }).click();
  await page.waitForTimeout(HOLD);

  // Now switch to Open G — a non-CAGED tuning. The same view should
  // surface the empty state with the explanation and the
  // "Switch to Standard tuning" button. /Open G/ alone matches "Open Gm"
  // too — use first() (Open G appears before Open Gm in the popover).
  await tuningTrigger.click();
  await page.waitForTimeout(STEP);
  await page
    .getByRole("option", { name: /Open G/ })
    .first()
    .click();
  await page.waitForTimeout(HOLD);

  // Click the empty-state's recovery button — view re-renders normally
  // because Standard supports Scale Positions.
  await page.getByRole("button", { name: "Switch to Standard tuning" }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "tunings.gif"), (Date.now() - start) / 1000);
  console.log("✓ tunings.gif");
}

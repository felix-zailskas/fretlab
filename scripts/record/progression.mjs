import { join } from "node:path";
import {
  newDarkContext,
  loadApp,
  toGif,
  addChords,
  outDir,
  STEP,
  HOLD,
} from "./_lib.mjs";

// Headless Chromium can report AudioContext.state "running" while currentTime
// stays frozen, so the metronome never sees a beat come due. Swap in a silent
// stub whose clock follows performance.now() (same as tests/e2e/fakeAudio.ts).
function installFakeAudio() {
  class FakeAudioContext {
    state = "running";
    destination = {};
    createdAt = performance.now();
    get currentTime() {
      return (performance.now() - this.createdAt) / 1000;
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  window.AudioContext = FakeAudioContext;
}

// The progression player: build a progression from the lane's picker, turn
// on the next-chord preview, and play it. The chip's line fills across the
// beat ticks, the board fades between chords, and rings mark where the next
// chord's new notes land before each change.
export async function record(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  await context.addInitScript(installFakeAudio);
  const page = await context.newPage();
  await loadApp(page);

  // Picker stays open between picks — I, vi, IV, V.
  await addChords(page, ["C", "Am", "F", "G"], STEP);
  await page.waitForTimeout(STEP);

  // Preview the next chord on the last beat of each one-bar chord. ("1 bar"
  // would preview a one-bar chord from its first beat, so the rings would
  // never go away.) 100 BPM keeps the last beat long enough to see.
  await page.getByRole("combobox", { name: "Preview next chord" }).selectOption("1");
  const bpm = page.getByRole("spinbutton", { name: "BPM" });
  await bpm.fill("100");
  await bpm.press("Enter");
  await page.waitForTimeout(STEP);

  // 100 BPM in 4/4 → 2.4 s per chord; play through the four chords once.
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(9800);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "progression.gif"), (Date.now() - start) / 1000);
  console.log("✓ progression.gif");
}

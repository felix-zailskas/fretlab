// Orchestrator for the per-artifact recorders in scripts/record/. Each
// artifact has its own module so re-recording one (e.g. tunings.gif after
// a UI tweak) doesn't risk drift in the others. Shared helpers live in
// scripts/record/_lib.mjs.
//
// Usage (with the dev server already running on http://localhost:5173):
//   node scripts/record-assets.mjs            # all assets
//   node scripts/record-assets.mjs hero       # one
//   node scripts/record-assets.mjs note-map tunings
//
// Requires ffmpeg on PATH for WebM → GIF conversion.

import { chromium } from "playwright";
import { existsSync, rmSync } from "node:fs";

import { ensureDirs, tmpDir } from "./record/_lib.mjs";
import { record as recordHero } from "./record/hero.mjs";
import { record as recordNoteMap } from "./record/note-map.mjs";
import { record as recordScalePositions } from "./record/scale-positions.mjs";
import { record as recordChordShapes } from "./record/chord-shapes.mjs";
import { record as recordModalMode } from "./record/modal-mode.mjs";
import { record as recordTunings } from "./record/tunings.mjs";
import { record as recordCustomTuning } from "./record/custom-tuning.mjs";
import { record as recordStringToggle } from "./record/string-toggle.mjs";

const RECORDERS = {
  hero: recordHero,
  "note-map": recordNoteMap,
  "scale-positions": recordScalePositions,
  "chord-shapes": recordChordShapes,
  "modal-mode": recordModalMode,
  tunings: recordTunings,
  "custom-tuning": recordCustomTuning,
  "string-toggle": recordStringToggle,
};

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : Object.keys(RECORDERS);
const unknown = targets.filter((t) => !(t in RECORDERS));
if (unknown.length > 0) {
  console.error(`Unknown asset(s): ${unknown.join(", ")}`);
  console.error(`Known: ${Object.keys(RECORDERS).join(", ")}`);
  process.exit(1);
}

ensureDirs();
// Start each run from a clean tmp dir so leftover palettes/webms from a
// previous run don't get mistaken for the current one.
rmSync(tmpDir, { recursive: true, force: true });
ensureDirs();

const browser = await chromium.launch();
try {
  for (const t of targets) {
    await RECORDERS[t](browser);
  }
} finally {
  await browser.close();
  // Leave tmpDir behind when FRETLAB_KEEP_TMP=1 so palette files / webms
  // are inspectable without re-running.
  if (existsSync(tmpDir) && process.env.FRETLAB_KEEP_TMP !== "1") {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

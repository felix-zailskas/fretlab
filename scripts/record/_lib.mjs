// Shared helpers for the per-artifact recorders in this directory.
// Each recorder file exports a single async `record(browser)` function and
// imports whatever it needs from here. Keeping the building blocks in one
// place means re-recording one artifact (e.g. tunings.gif) doesn't risk
// drift from the others.

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "..", "..");
export const outDir = join(repoRoot, "docs", "images");
export const tmpDir = join(repoRoot, "scripts", ".recording-tmp");

export const VIEWPORT = { width: 1440, height: 900 };
// Dev server serves the app at the root path. Override via FRETLAB_URL when
// recording against a different deployment (e.g. https://fretlab.studio/).
export const URL_BASE = process.env.FRETLAB_URL ?? "http://localhost:5173/";
export const GIF_FPS = 10;
export const GIF_WIDTH = 960;
export const TRIM_HEAD = 0.4; // seconds — drop initial paint flash
export const TRIM_TAIL = 0.3;

// Tab-switching recordings need a longer head trim so the loop point doesn't
// flash the default Note Map view. 1.4s = base 0.4s + 1.0s for goto + tab
// click + view transition.
export const TAB_SWITCH_TRIM_HEAD = 1.4;

// Pacing — tuned so a viewer can track each step on first watch.
export const STEP = 750;
export const SHORT = 350;
export const HOLD = 1300;

// Call once per process from the orchestrator. Recorders shouldn't manage
// directories themselves.
export function ensureDirs() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
}

export async function newDarkContext(browser, recordVideo = false, viewportOverride) {
  const viewport = viewportOverride ?? VIEWPORT;
  const context = await browser.newContext({
    viewport,
    colorScheme: "dark",
    deviceScaleFactor: recordVideo ? 1 : 2,
    reducedMotion: "no-preference",
    ...(recordVideo ? { recordVideo: { dir: tmpDir, size: viewport } } : {}),
  });
  return context;
}

export async function loadApp(page) {
  await page.goto(URL_BASE, { waitUntil: "networkidle" });
  // Wait for the fretboard SVG to render — that's the "app is ready" signal.
  await page.locator("svg").first().waitFor({ state: "visible" });
  await page.waitForTimeout(200);
}

// WebM → GIF via ffmpeg, with two-pass palette generation for quality.
// `trimHead` defaults to TRIM_HEAD; tab-switching recorders pass
// TAB_SWITCH_TRIM_HEAD to drop the pre-target-view flash from the loop point.
export function toGif(webmPath, gifPath, durationSec, trimHead = TRIM_HEAD) {
  const palette = join(tmpDir, `palette-${Date.now()}.png`);
  const trimmedDur = Math.max(0.5, durationSec - trimHead - TRIM_TAIL);
  const baseFilters = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos`;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(trimHead),
      "-t",
      String(trimmedDur),
      "-i",
      webmPath,
      "-vf",
      `${baseFilters},palettegen=stats_mode=diff`,
      "-update",
      "1",
      palette,
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(trimHead),
      "-t",
      String(trimmedDur),
      "-i",
      webmPath,
      "-i",
      palette,
      "-lavfi",
      `${baseFilters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5`,
      gifPath,
    ],
    { stdio: "inherit" },
  );
}

// Helpers scoped to specific control groups so we never grab the wrong radio.
export const inGroup = (page, label) =>
  page.locator(
    `[role="radiogroup"][aria-label="${label}"], [role="group"][aria-label="${label}"]`,
  );

export const chordRowMode = (page) => inGroup(page, "Chord row mode");
export const stringGroups = (page) => inGroup(page, "String groups");
export const inversions = (page) => inGroup(page, "Inversions");
export const highlightRoles = (page) => inGroup(page, "Highlight roles");
// The voicing system is a native <select> in sevenths mode.
export const voicingSystem = (page) =>
  page.getByRole("combobox", { name: "Voicing system" });

// Key and Mode are native <select>s in the header. Key values are note names
// ("C", "Eb", …) or "all"; mode values are ids ("dorian", "aeolian", …).
export const selectKey = (page, key) =>
  page.getByRole("combobox", { name: "Key" }).selectOption(key);
export const selectMode = (page, mode) =>
  page.getByRole("combobox", { name: "Mode" }).selectOption(mode);

// Accidentals, theme, tuning and fret range live in the header's settings
// popover. Opens it, runs `fn`, then closes it with Escape.
export async function inSettings(page, fn) {
  await page.getByRole("button", { name: /^Settings/ }).click();
  await page.waitForTimeout(SHORT);
  await fn(page.getByRole("dialog", { name: "Settings" }));
  await page.keyboard.press("Escape");
  // Escape returns focus to the trigger; drop its focus ring for the video.
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(SHORT);
}

// Scale-position labels (P1…P5) sit in the strip above the board.
export const regionToggle = (page, id) =>
  page.locator(`[data-testid="region-toggle"][data-region-id="${id}"]`);

// Adds chords through the progression lane's picker, which stays open
// between picks, then closes it. `pause` paces the picks for recordings.
export async function addChords(page, symbols, pause = 0) {
  await page.getByRole("button", { name: /^＋/ }).click();
  await page.waitForTimeout(pause);
  for (const symbol of symbols) {
    await page
      .getByRole("button", { name: `Add ${symbol} to progression`, exact: true })
      .click();
    await page.waitForTimeout(pause);
  }
  await page.keyboard.press("Escape");
}

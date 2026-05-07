// Drives the running dev server with Playwright to capture the README hero
// shot and the four feature GIFs. Each clip clicks real UI controls (no DOM
// injection) so the recording reflects production interaction timing.
//
// Usage (with the dev server already running on http://localhost:5173):
//   node scripts/record-assets.mjs            # all assets
//   node scripts/record-assets.mjs hero       # one
//   node scripts/record-assets.mjs note-map modal-mode
//
// Requires ffmpeg on PATH for WebM → GIF conversion.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const outDir = join(repoRoot, "docs", "images");
const tmpDir = join(here, ".recording-tmp");

const VIEWPORT = { width: 1440, height: 900 };
// vite.config.ts sets `base: '/fretlab/'`, so the dev + Pages URLs both serve
// the app under that subpath. Override via FRETLAB_URL if pointing elsewhere.
const URL_BASE = process.env.FRETLAB_URL ?? "http://localhost:5173/fretlab/";
const GIF_FPS = 10;
const GIF_WIDTH = 960;
const TRIM_HEAD = 0.4; // seconds — drop initial paint flash
const TRIM_TAIL = 0.3;

// Pacing — these are tuned so a viewer can track each step on first watch.
const STEP = 750;
const SHORT = 350;
const HOLD = 1300;

mkdirSync(outDir, { recursive: true });
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

// ── helpers ────────────────────────────────────────────────────────────────

async function newDarkContext(browser, recordVideo = false, viewportOverride) {
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

async function loadApp(page) {
  await page.goto(URL_BASE, { waitUntil: "networkidle" });
  // Wait for the fretboard SVG to render — that's the "app is ready" signal.
  await page.locator("svg").first().waitFor({ state: "visible" });
  await page.waitForTimeout(200);
}

// Tab-switching views (Scale Positions, Chord Shapes) start the recording on
// the default Note Map view, then click the tab. With only TRIM_HEAD trimmed,
// the GIF's first frame is still the Note Map flash, so when the GIF loops
// back you see Note Map for a split second. Pass a longer trimHead for those
// recordings to drop the entire pre-target-view portion.
function toGif(webmPath, gifPath, durationSec, trimHead = TRIM_HEAD) {
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

// Tab-switching recordings need a longer head trim so the loop point doesn't
// flash the default Note Map view. 1.4s = the script's base 0.4s + 1.0s for
// the goto + tab click + view transition.
const TAB_SWITCH_TRIM_HEAD = 1.4;

// Helpers scoped to specific control groups so we never grab the wrong radio.
const inGroup = (page, label) =>
  page.locator(
    `[role="radiogroup"][aria-label="${label}"], [role="group"][aria-label="${label}"]`,
  );

const chordRowMode = (page) => inGroup(page, "Chord row mode");
const shapeLanguage = (page) => inGroup(page, "Chord-shape language");
const voicingSystem = (page) => inGroup(page, "Voicing system");
const stringGroups = (page) => inGroup(page, "String groups");
const inversions = (page) => inGroup(page, "Inversions");

// ── hero ───────────────────────────────────────────────────────────────────

async function recordHero(browser) {
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

// ── note-map.gif ───────────────────────────────────────────────────────────

async function recordNoteMap(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Sevenths mode for richer chord-tone color set.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // Cycle keys: C → G → D → Eb (flip to flats first for Eb).
  await page.getByRole("button", { name: "G", exact: true }).click();
  await page.waitForTimeout(STEP);
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.waitForTimeout(STEP);
  await page.locator('button[title="Flat spelling"]').click();
  await page.waitForTimeout(SHORT);
  await page.getByRole("button", { name: "Eb", exact: true }).click();
  await page.waitForTimeout(HOLD);

  // Cycle chords I → ii → iii → IV → V → vi → vii° via 1-7 shortcuts.
  for (const k of ["2", "3", "4", "5", "6", "7"]) {
    await page.keyboard.press(k);
    await page.waitForTimeout(STEP);
  }
  // Back to I for legend toggle demo.
  await page.keyboard.press("1");
  await page.waitForTimeout(STEP);

  // Toggle 3rd / 5th / 7th in Legend (off then on).
  for (const role of ["3rd", "5th", "7th"]) {
    const btn = page.getByRole("button", { name: role, exact: true });
    await btn.click();
    await page.waitForTimeout(SHORT);
    await btn.click();
    await page.waitForTimeout(SHORT);
  }
  await page.waitForTimeout(STEP);

  // Sharp → flat already done; flip back so the All Notes view is in the
  // sharp default the README caption assumes.
  await page.locator('button[title="Sharp spelling"]').click();
  await page.waitForTimeout(SHORT);

  // Switch key to All Notes — disables key filtering.
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "note-map.gif"), (Date.now() - start) / 1000);
  console.log("✓ note-map.gif");
}

// ── scale-positions.gif ────────────────────────────────────────────────────

async function recordScalePositions(browser) {
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

  // Initial state: P1 toggled on. Match by unique title="Pn-shape position …".
  const positionBtn = (id) => page.locator(`button[title^="${id}-shape"]`);
  await positionBtn("P1").click();
  await page.waitForTimeout(HOLD);

  // P2 — overlap zone appears.
  await positionBtn("P2").click();
  await page.waitForTimeout(HOLD);

  // P3 — three boxes, two overlap zones.
  await positionBtn("P3").click();
  await page.waitForTimeout(HOLD);

  // Deselect I — markers shift to plain scale tones (no chord context).
  await page.keyboard.press("1");
  await page.waitForTimeout(HOLD);

  // Re-select I for the next steps.
  await page.keyboard.press("1");
  await page.waitForTimeout(STEP);

  // Switch key to G — boxes shift up the neck.
  await page.getByRole("button", { name: "G", exact: true }).click();
  await page.waitForTimeout(HOLD);

  // Show context notes — out-of-position in-key notes appear muted.
  await page.getByLabel("Show context notes").check();
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

// ── chord-shapes.gif ───────────────────────────────────────────────────────

async function recordChordShapes(browser) {
  const start = Date.now();
  // Chord Shapes view is taller than the others (~1026px content) — bump the
  // recording viewport so the Legend at the bottom isn't clipped.
  const context = await newDarkContext(browser, true, { width: 1440, height: 1080 });
  const page = await context.newPage();
  await loadApp(page);

  // Switch to Chord Shapes tab. Default state: Triad shapes mode, 1-2-3
  // string-set, all 3 triad inversions selected → shapes render immediately.
  await page.getByRole("tab", { name: "Chord Shapes" }).click();
  await page.waitForTimeout(HOLD);

  // Switch to 7th chord shapes mode. Defaults carry over: low position
  // (3-4-5-6 in close voicing) and Root inversion — board stays populated.
  await shapeLanguage(page).getByRole("radio", { name: "7th chord shapes" }).click();
  await page.waitForTimeout(HOLD);

  // Cycle voicing systems with Root inversion + low position kept ON the whole
  // time, so each system renders the Cmaj7 root voicing in its own shape.
  // Exact match — "Drop 2" is a substring of "Drop 2&4".
  for (const sys of ["Drop 2", "Drop 3", "Drop 2&4"]) {
    await voicingSystem(page).getByRole("radio", { name: sys, exact: true }).click();
    await page.waitForTimeout(HOLD);
  }
  // Back to Close for the next steps.
  await voicingSystem(page).getByRole("radio", { name: "Close", exact: true }).click();
  await page.waitForTimeout(STEP);

  // Add 1st Inversion alongside Root — two voicings now stacked on low.
  await inversions(page).getByRole("button", { name: "1st Inversion" }).click();
  await page.waitForTimeout(HOLD);

  // Add the mid string-set (2-3-4-5 in close voicing) — Root + 1st rendered
  // on both low and mid, populating more of the neck.
  await stringGroups(page).getByRole("button", { name: "2-3-4-5" }).click();
  await page.waitForTimeout(HOLD);

  // Switch back to Triad shapes — voicing selector hides, string-sets become
  // 1-2-3 / 2-3-4 / 3-4-5 / 4-5-6, and the triad-side state (1-2-3 + all 3
  // inversions) takes over so shapes are still on screen.
  await shapeLanguage(page).getByRole("radio", { name: "Triad shapes" }).click();
  await page.waitForTimeout(HOLD);

  // Add a 2nd triad string-set so shapes ascend the neck.
  await stringGroups(page).getByRole("button", { name: "2-3-4" }).click();
  await page.waitForTimeout(HOLD);

  // Toggle 3rd off in Legend — markers DIM (don't disappear).
  await page.getByRole("button", { name: "3rd", exact: true }).click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(
    webm,
    join(outDir, "chord-shapes.gif"),
    (Date.now() - start) / 1000,
    TAB_SWITCH_TRIM_HEAD,
  );
  console.log("✓ chord-shapes.gif");
}

// ── modal-mode.gif ─────────────────────────────────────────────────────────

async function recordModalMode(browser) {
  const start = Date.now();
  const context = await newDarkContext(browser, true);
  const page = await context.newPage();
  await loadApp(page);

  // Stay on Note Map (default) — it's the cleanest view to show modal effects.
  // Sevenths mode for the chord row so modal Roman numerals show maj7/m7/etc.
  await chordRowMode(page).getByRole("radio", { name: "Sevenths" }).click();
  await page.waitForTimeout(STEP);

  // Cycle modes Ionian → Dorian → Phrygian → Lydian → Mixolydian → Aeolian → Locrian.
  // Exact match — "Lydian" is a substring of "Mixolydian".
  const modeRadio = (name) => page.getByRole("radio", { name, exact: true });
  for (const mode of [
    "Dorian",
    "Phrygian",
    "Lydian",
    "Mixolydian",
    "Aeolian",
    "Locrian",
  ]) {
    await modeRadio(mode).click();
    await page.waitForTimeout(HOLD);
  }
  // Back to Ionian briefly before the parent-key demo.
  await modeRadio("Ionian").click();
  await page.waitForTimeout(STEP);

  // Switch to D Lydian — accidental should auto-flip to sharps (parent A major).
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.waitForTimeout(SHORT);
  await modeRadio("Lydian").click();
  await page.waitForTimeout(HOLD);

  // Switch to D Phrygian — accidental should auto-flip to flats (parent Bb major).
  await modeRadio("Phrygian").click();
  await page.waitForTimeout(HOLD);

  // Manual override: click sharp — sticks until next key/mode change.
  await page.locator('button[title="Sharp spelling"]').click();
  await page.waitForTimeout(HOLD);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  toGif(webm, join(outDir, "modal-mode.gif"), (Date.now() - start) / 1000);
  console.log("✓ modal-mode.gif");
}

// ── runner ─────────────────────────────────────────────────────────────────

const RECORDERS = {
  hero: recordHero,
  "note-map": recordNoteMap,
  "scale-positions": recordScalePositions,
  "chord-shapes": recordChordShapes,
  "modal-mode": recordModalMode,
};

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : Object.keys(RECORDERS);
const unknown = targets.filter((t) => !(t in RECORDERS));
if (unknown.length > 0) {
  console.error(`Unknown asset(s): ${unknown.join(", ")}`);
  console.error(`Known: ${Object.keys(RECORDERS).join(", ")}`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  for (const t of targets) {
    await RECORDERS[t](browser);
  }
} finally {
  await browser.close();
  // Leave tmpDir behind so palette files are inspectable; webm files inside
  // can be useful for debugging timing without re-running.
  if (existsSync(tmpDir) && process.env.FRETLAB_KEEP_TMP !== "1") {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

import { test, expect, type Page } from "@playwright/test";
import { installFakeAudio } from "./fakeAudio";

// C major triads: F, G and Am are unique on the chord map (C also appears as
// V/IV, so it is avoided here).
async function addChords(page: Page, symbols: readonly string[]) {
  for (const symbol of symbols) {
    await page
      .getByRole("button", { name: `Add ${symbol} to progression`, exact: true })
      .click();
  }
}

async function setBpm(page: Page, bpm: number) {
  const input = page.getByRole("spinbutton", { name: "BPM" });
  await input.fill(String(bpm));
  await input.press("Enter");
}

const selectedCard = (page: Page) =>
  page.locator('[data-testid="chord-card"][aria-pressed="true"]');

test.describe("progression player", () => {
  test.beforeEach(async ({ page }) => {
    await installFakeAudio(page);
  });

  test("plays through the progression and drives the chord selection", async ({
    page,
  }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);
    await setBpm(page, 300);
    await page.getByRole("button", { name: "Play", exact: true }).click();

    const slots = page.getByTestId("progression-slot");
    await expect(slots.nth(0)).toHaveAttribute("data-current", "true");
    await expect(selectedCard(page)).toHaveAttribute("data-degree", "4");

    // 300 BPM, 4/4, 1 bar per slot → 0.8 s per chord.
    await expect(slots.nth(1)).toHaveAttribute("data-current", "true", {
      timeout: 5000,
    });
    await expect(selectedCard(page)).toHaveAttribute("data-degree", "5");

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("drags the third slot to the first position", async ({ page }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);

    // dnd-kit keyboard drag: deterministic, and exercises the KeyboardSensor.
    const handle = page.getByRole("button", { name: "Reorder Am" });
    await handle.focus();
    await page.keyboard.press("Space");
    // dnd-kit measures droppables after the drag starts; arrows sent earlier are lost.
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    // The live region announces each move, so each arrow is awaited in turn.
    const live = page.locator('[role="status"][aria-live="assertive"]');
    await page.keyboard.press("ArrowLeft");
    await expect(live).toContainText("was moved over droppable area");
    const afterFirst = await live.textContent();
    await page.keyboard.press("ArrowLeft");
    await expect(live).not.toHaveText(afterFirst ?? "");
    // Let dnd-kit commit the new `over` target before dropping.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.keyboard.press("Space");

    await expect(page.getByTestId("progression-slot").nth(0)).toContainText("Am");
  });

  test("keeps the progression and BPM across a reload", async ({ page }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);
    await setBpm(page, 150);

    await page.reload();

    await expect(page.getByTestId("progression-slot")).toHaveCount(3);
    await expect(page.getByTestId("progression-slot").nth(2)).toContainText("Am");
    await expect(page.getByRole("spinbutton", { name: "BPM" })).toHaveValue("150");
  });

  test("plays as a metronome with an empty progression", async ({ page }) => {
    await page.goto("/");
    await setBpm(page, 300);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();

    // 300 BPM → 0.2 s per beat: the current transport dot must move.
    const dots = page.locator('[data-testid="beat-dot"][data-source="transport"]');
    await expect(dots).toHaveCount(4);
    const indexOfCurrent = () =>
      dots.evaluateAll((els) => els.findIndex((e) => e.dataset.current === "true"));
    const seen = new Set<number>();
    await expect
      .poll(
        async () => {
          seen.add(await indexOfCurrent());
          return seen.size;
        },
        { timeout: 5000 },
      )
      .toBeGreaterThanOrEqual(3);

    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  });
});

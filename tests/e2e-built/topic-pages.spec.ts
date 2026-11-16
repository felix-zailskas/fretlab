import { test, expect } from "@playwright/test";

// Runs against `vite preview` of the production build (see the "built"
// project in playwright.config.ts), so it exercises the pre-rendered HTML
// and the static file layout GitHub Pages serves.

const TOPIC = "/scales/minor-pentatonic/e-shape";
const region = (id: string) => `[data-testid="region-toggle"][data-region-id="${id}"]`;

test("serves a pre-rendered topic page with its own title and intro", async ({
  request,
}) => {
  const res = await request.get(TOPIC);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain(
    "<title>Minor Pentatonic E Shape (Box 1) on Guitar | Fretlab</title>",
  );
  expect(html).toContain('data-testid="topic-strip"');
  expect(html).toContain('data-testid="note-marker"');
});

test("opens the topic in the app: Scale Positions, box 1 on, intro visible", async ({
  page,
}) => {
  await page.goto(TOPIC);
  await expect(page.getByRole("tab", { name: "Scale Positions" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(region("P1"))).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("topic-strip")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Minor Pentatonic E shape (box 1)",
  );
});

test("a key change keeps the path; a mode change leaves the topic", async ({
  page,
}) => {
  await page.goto(TOPIC);
  await page.getByRole("combobox", { name: "Key" }).selectOption("E");
  await expect(page).toHaveURL(`${TOPIC}?key=E`);
  await page.getByRole("combobox", { name: "Mode" }).selectOption("dorian");
  await expect(page).toHaveURL(/\/\?view=scales&key=E&mode=dorian/);
  await expect(page.getByTestId("topic-strip")).toHaveCount(0);
});

test("Back after several setting changes returns to the previous tab", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Scale Positions" }).click();
  await page.getByRole("combobox", { name: "Key" }).selectOption("G");
  await page.getByRole("combobox", { name: "Key" }).selectOption("D");
  await page.locator(region("P2")).click();
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Note Map" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("a mistyped topic path still opens the app", async ({ page }) => {
  await page.goto("/scales/minor-pentatonic/h-shape");
  await expect(page.getByRole("tab", { name: "Note Map" })).toBeVisible();
});

test("at 1280×720 the board ends above the fold with the intro open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(TOPIC);
  await expect(page.getByTestId("topic-strip")).toBeVisible();
  const lowString = page
    .locator('[data-testid="note-marker"][data-string="0"]')
    .first();
  const box = await lowString.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);
});

test("on a 390 px phone the intro collapses and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(TOPIC);
  await expect(
    page.getByRole("button", { name: "More about this topic" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

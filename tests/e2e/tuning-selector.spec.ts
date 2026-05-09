import { test, expect } from "@playwright/test";

test.describe("TuningSelector", () => {
  test("trigger label reflects active tuning and popover opens with grouped options", async ({
    page,
  }) => {
    await page.goto("/");

    // Trigger button shows current tuning
    const trigger = page.getByRole("button", { name: /Tuning: Standard/ });
    await expect(trigger).toBeVisible();

    // Open the popover
    await trigger.click();

    // Listbox with name "Tuning" is visible
    const listbox = page.getByRole("listbox", { name: "Tuning" });
    await expect(listbox).toBeVisible();

    // All four group headers are present. The headers have role="presentation"
    // and contain only the group label text, so we scope to exact text matches
    // on elements within the listbox.
    await expect(
      listbox.locator('[role="presentation"]').filter({ hasText: /^Standard$/ }),
    ).toBeVisible();
    await expect(
      listbox.locator('[role="presentation"]').filter({ hasText: /^Open Tunings$/ }),
    ).toBeVisible();
    await expect(
      listbox.locator('[role="presentation"]').filter({ hasText: /^Drop Tunings$/ }),
    ).toBeVisible();
    await expect(
      listbox.locator('[role="presentation"]').filter({ hasText: /^Modal & Other$/ }),
    ).toBeVisible();

    // A known option from each group is reachable.
    // Use .first() where a substring matches multiple options (e.g. "Open G"
    // and "Open Gm" both contain "Open G"); the test only needs to confirm
    // the group has at least one option, not which one specifically.
    await expect(page.getByRole("option", { name: /Open G/ }).first()).toBeVisible();
    await expect(page.getByRole("option", { name: /D Standard/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Drop D/ }).first()).toBeVisible();
    await expect(page.getByRole("option", { name: /DADGAD/ })).toBeVisible();
  });

  test("selecting a tuning closes the popover and updates the trigger label", async ({
    page,
  }) => {
    await page.goto("/");

    // Open the popover
    await page.getByRole("button", { name: /Tuning: Standard/ }).click();
    await expect(page.getByRole("listbox", { name: "Tuning" })).toBeVisible();

    // Click "Open G" — use .first() to resolve the strict-mode ambiguity
    // between "Open G" and "Open Gm" (both match /Open G/).
    await page.getByRole("option", { name: /Open G/ }).first().click();

    // Popover closes
    await expect(page.getByRole("listbox", { name: "Tuning" })).not.toBeAttached();

    // Trigger label updated
    await expect(page.getByRole("button", { name: /Tuning: Open G/ })).toBeVisible();
  });
});

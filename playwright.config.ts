import { defineConfig, devices } from "@playwright/test";

// E2E tests live in tests/e2e/. They run against the Vite dev server, which
// Playwright spins up automatically. Browsers must be installed via
// `npx playwright install chromium` once per machine. CI installs them in
// the workflow.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // CI gets one retry to absorb cold-start flakes; locally, fail fast.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Vite's `base: "/fretlab/"` means the app lives at this path.
    baseURL: "http://localhost:5173/fretlab/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/fretlab/",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  },
});

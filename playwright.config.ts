import { defineConfig, devices } from "@playwright/test";

// E2E tests live in tests/e2e/ (run against the Vite dev server) and
// tests/e2e-built/ (run against `vite preview` of the production build, to
// cover the pre-rendered pages). Playwright starts both servers. Browsers must be installed via
// `npx playwright install chromium` once per machine. CI installs them in
// the workflow.
export default defineConfig({
  fullyParallel: true,
  // CI gets one retry to absorb cold-start flakes; locally, fail fast.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173/",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"] } },
    {
      name: "built",
      testDir: "./tests/e2e-built",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173/" },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173/",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort",
      url: "http://localhost:4173/",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 180_000,
    },
  ],
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test runner config kept separate from vite.config.ts so the dev/build
// pipeline doesn't pull in jsdom/testing-library deps.
//
// Pure-logic tests (.test.ts) run in node — fastest and matches the original
// setup. Component tests (.test.tsx) run in jsdom so React + DOM APIs work.
// The `environmentMatchGlobs` mechanism applies the right environment per file.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: "node",
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["src/components/**/*.test.ts", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "dist", "tests/e2e/**"],
  },
});

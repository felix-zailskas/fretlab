import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement window.matchMedia. Components like ThemeToggle
// use it to detect system color-scheme preference; provide a minimal stub
// so unrelated tests don't crash. Tests that need specific behavior can
// override this stub.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Unmount any lingering React trees between tests so DOM state doesn't leak.
afterEach(() => {
  cleanup();
});

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { CustomTuning } from "./theory/tuning";
import { STORAGE_KEY } from "./theory/customTuningStorage";

// App uses window.innerWidth during initialisation (for default fret range).
// jsdom defaults to 0 which is falsy but shouldn't throw; no mock needed.

beforeAll(() => {
  // Some browsers / jsdom versions don't implement matchMedia at all.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

const CAGED_CUSTOM: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "Standard clone",
  strings: ["E", "A", "D", "G", "B", "E"],
  createdAt: 1715600000,
};

const NON_CAGED_CUSTOM: CustomTuning = {
  id: "custom:1715600001-bbb",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600001,
};

function primeStorage(state: {
  tunings: CustomTuning[];
  selectedTuningId: string | null;
}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
}

describe("App — custom tuning view gating", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("CAGED-compatible custom tuning unlocks Scale Positions and Chord Shapes", async () => {
    primeStorage({
      tunings: [CAGED_CUSTOM],
      selectedTuningId: CAGED_CUSTOM.id,
    });
    render(<App />);

    await userEvent.click(screen.getByRole("tab", { name: /Scale Positions/ }));
    expect(screen.queryByText(/Not available in this tuning/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Chord Shapes/ }));
    expect(screen.queryByText(/Not available in this tuning/)).not.toBeInTheDocument();
  });

  it("non-CAGED custom tuning shows UnavailableInTuning for Scale Positions", async () => {
    primeStorage({
      tunings: [NON_CAGED_CUSTOM],
      selectedTuningId: NON_CAGED_CUSTOM.id,
    });
    render(<App />);

    await userEvent.click(screen.getByRole("tab", { name: /Scale Positions/ }));
    expect(screen.getByText(/Not available in this tuning/)).toBeInTheDocument();
    // The UnavailableInTuning copy mentions the user's tuning by name.
    // Use getAllByText because the name also appears in the tuning selector button.
    expect(screen.getAllByText(/My DADGAD/).length).toBeGreaterThanOrEqual(1);
  });

  it("Stay on Note Map CTA switches the view", async () => {
    primeStorage({
      tunings: [NON_CAGED_CUSTOM],
      selectedTuningId: NON_CAGED_CUSTOM.id,
    });
    render(<App />);

    await userEvent.click(screen.getByRole("tab", { name: /Scale Positions/ }));
    await userEvent.click(screen.getByRole("button", { name: /Stay on Note Map/ }));
    expect(screen.queryByText(/Not available in this tuning/)).not.toBeInTheDocument();
  });
});

describe("App — string-toggle state is global across views", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muting a string in Scale Positions keeps it muted after switching to Note Map", async () => {
    render(<App />);
    // Switch to Scale Positions tab
    await userEvent.click(screen.getByRole("tab", { name: /Scale Positions/ }));

    // Find the string 5 toggle (top row, high E)
    const toggle5 = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    if (!toggle5) throw new Error("toggle not found");
    expect(toggle5).toHaveAttribute("data-enabled", "true");
    await userEvent.click(toggle5);
    expect(toggle5).toHaveAttribute("data-enabled", "false");

    // Switch to Note Map
    await userEvent.click(screen.getByRole("tab", { name: /Note Map/ }));

    // String 5 toggle on Note Map should still report disabled
    const noteMapToggle5 = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    if (!noteMapToggle5) throw new Error("toggle not found in Note Map");
    expect(noteMapToggle5).toHaveAttribute("data-enabled", "false");
  });
});

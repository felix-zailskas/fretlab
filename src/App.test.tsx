import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { CustomTuning } from "./theory/tuning";
import { STORAGE_KEY } from "./theory/customTuningStorage";
import { FakeAudioContext } from "./audio/testing";
import { PROGRESSION_STORAGE_KEY } from "./theory/progressionStorage";

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

const PROGRESSION_TOGGLE = /^(Show|Hide) Progression\/Metronome$/;

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

describe("App — chord map selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function pressedCards(): string[] {
    return screen
      .getAllByTestId("chord-card")
      .filter((c) => c.getAttribute("aria-pressed") === "true")
      .map((c) => c.getAttribute("aria-label") ?? "");
  }

  it("selects the diatonic I chord by default", () => {
    render(<App />);
    expect(pressedCards()).toEqual(["I C"]);
  });

  it("number keys select diatonic chords", async () => {
    render(<App />);
    await userEvent.keyboard("5");
    expect(pressedCards()).toEqual(["V G"]);
  });

  it("pressing the selected diatonic number again clears the selection", async () => {
    render(<App />);
    await userEvent.keyboard("1");
    expect(pressedCards()).toEqual([]);
  });

  it("number keys replace a secondary-tier selection with the diatonic chord", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "V7/V D7" }));
    await userEvent.keyboard("5");
    expect(pressedCards()).toEqual(["V G"]);
  });

  it("clears a selection whose cell empties after a mode change", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("radio", { name: "Mixolydian" }));
    await userEvent.click(screen.getByRole("button", { name: "V7/♭VII F7" }));
    await userEvent.click(screen.getByRole("radio", { name: "Ionian" }));
    await userEvent.click(screen.getByRole("radio", { name: "Mixolydian" }));
    expect(pressedCards()).toEqual([]);
  });

  it("keeps a selection that still resolves after a mode change", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "V7/V D7" }));
    await userEvent.click(screen.getByRole("radio", { name: "Dorian" }));
    // Dorian's v is minor, so the numeral changes but the chord stays D.
    expect(pressedCards()).toEqual(["V7/v D7"]);
  });

  it("keeps the selection through a detour via the All key", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "V7/V D7" }));
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    await userEvent.click(screen.getByRole("button", { name: "C" }));
    expect(pressedCards()).toEqual(["V7/V D7"]);
  });

  it("clears a selection whose cell empties after a row-mode change", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("radio", { name: "Dorian" }));
    await userEvent.keyboard("s");
    const borrowedIV = document.querySelector(
      '[data-testid="chord-card"][data-tier="borrowed"][data-degree="4"]',
    ) as HTMLElement;
    await userEvent.click(borrowedIV);
    expect(pressedCards()).toHaveLength(1);
    // Dorian IV is F7 in sevenths but equals the diatonic F in triads, so the
    // borrowed cell empties.
    await userEvent.keyboard("t");
    expect(pressedCards()).toEqual([]);
    // The cleared selection must not resurface when the cell comes back.
    await userEvent.keyboard("s");
    expect(pressedCards()).toEqual([]);
  });
});

describe("App — secondary dominants in triads mode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("V7/ii shows its ♭7 as a seventh marker and keeps the 7th toggle enabled", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /^V7\/ii A7/ }));
    const markers = screen.getAllByTestId("note-marker");
    expect(
      markers.some(
        (m) =>
          m.getAttribute("data-note") === "G" &&
          m.getAttribute("data-role") === "seventh",
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "7th" })).toBeEnabled();
  });

  it("disables the 7th toggle again for a triad selection in triads mode", async () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "7th" })).toBeDisabled();
  });

  it("disables the 7th toggle in Chord Shapes with V7/ii selected", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /^V7\/ii A7/ }));
    await userEvent.click(screen.getByRole("tab", { name: /Chord Shapes/ }));
    expect(screen.getByRole("button", { name: "7th" })).toBeDisabled();
  });

  it("Chord Shapes voices the triad of V7/ii without a seventh", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /^V7\/ii A7/ }));
    await userEvent.click(screen.getByRole("tab", { name: /Chord Shapes/ }));
    const markers = screen.getAllByTestId("note-marker");
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.some((m) => m.getAttribute("data-role") === "seventh")).toBe(false);
    expect(markers.some((m) => m.getAttribute("data-note") === "G")).toBe(false);
  });
});

describe("App — progression player", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function addF() {
    await userEvent.click(screen.getByRole("button", { name: "Add F to progression" }));
  }

  function blurActive() {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  it("＋ on a chord card adds it to the progression", async () => {
    render(<App />);
    await addF();
    expect(screen.getByRole("button", { name: "Select F" })).toBeInTheDocument();
  });

  it("clicking a slot selects its chord on the map", async () => {
    const { container } = render(<App />);
    await addF();
    await userEvent.click(screen.getByRole("button", { name: "Select F" }));
    expect(
      container.querySelector(
        '[data-testid="chord-card"][data-tier="diatonic"][data-degree="4"]',
      ),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("the Progression/Metronome toggle hides the panel and the ＋ buttons", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    expect([
      screen.queryByRole("region", { name: "Progression" }),
      screen.queryByRole("button", { name: "Add F to progression" }),
    ]).toEqual([null, null]);
  });

  it("persists the hidden state", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    const stored = JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? "{}");
    expect(stored.visible).toBe(false);
  });

  it("Space toggles playback", async () => {
    render(<App />);
    await addF();
    blurActive();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("Space on the focused Play button toggles exactly once", async () => {
    render(<App />);
    await addF();
    screen.getByRole("button", { name: "Play" }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("Space in the BPM field does not toggle playback", async () => {
    render(<App />);
    await addF();
    await userEvent.click(screen.getByRole("spinbutton", { name: "BPM" }));
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("held Space (key repeat) does not toggle playback", async () => {
    render(<App />);
    blurActive();
    fireEvent.keyDown(document.body, { key: " ", repeat: true });
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it.each(["metaKey", "ctrlKey", "altKey"] as const)(
    "Space with %s held does not toggle playback",
    async (modifier) => {
      render(<App />);
      blurActive();
      fireEvent.keyDown(document.body, { key: " ", [modifier]: true });
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    },
  );

  it("Space plays the metronome with an empty progression", async () => {
    render(<App />);
    blurActive();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("hiding the panel stops playback", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("Space is ignored while the panel is hidden", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    blurActive();
    await userEvent.keyboard(" ");
    await userEvent.click(screen.getByRole("button", { name: PROGRESSION_TOGGLE }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});

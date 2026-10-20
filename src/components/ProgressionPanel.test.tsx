import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressionPanel } from "./ProgressionPanel";
import { ALL_NOTES_KEY } from "../theory/notes";
import { useProgressionPlayer } from "../useProgressionPlayer";
import { FakeAudioContext } from "../audio/testing";
import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  type StoredProgression,
} from "../theory/progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "../theory/meter";

const barsLabel = (b: number) =>
  b === 0.5 ? "½ bar" : b === 1 ? "1 bar" : `${b} bars`;

function prime(patch: Partial<StoredProgression>) {
  localStorage.setItem(
    PROGRESSION_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PROGRESSION, ...patch }),
  );
}

function Harness({ selectedKey = "C" }: { selectedKey?: string }) {
  const player = useProgressionPlayer({
    selectedKey,
    mode: "ionian",
    rowMode: "triads",
    onChordChange: () => {},
  });
  return (
    <>
      <button type="button" onClick={() => player.add({ tier: "diatonic", degree: 4 })}>
        Add F
      </button>
      <ProgressionPanel player={player} disabled={selectedKey === ALL_NOTES_KEY} />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProgressionPanel — slots", () => {
  it("shows the empty state", () => {
    render(<Harness />);
    expect(
      screen.getByText("Click ＋ on a chord below to start a progression"),
    ).toBeInTheDocument();
  });

  it("adds a slot", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    expect(screen.getByRole("button", { name: "Select F" })).toBeInTheDocument();
  });

  it("removes a slot", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Remove F from progression" }),
    );
    expect(screen.queryByRole("button", { name: "Select F" })).not.toBeInTheDocument();
  });

  it("greys out a slot that is not on the map", () => {
    prime({ slots: [{ id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 }] });
    render(<Harness />);
    expect(screen.getByTestId("progression-slot")).toHaveAttribute(
      "title",
      "Not available in this mode",
    );
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "length stepper in %s",
  (_label, preset) => {
    const allowed = allowedSlotLengths(preset);

    beforeEach(() => {
      prime({
        timeSignature: preset,
        slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }],
      });
    });

    it("stops at the shortest allowed length", async () => {
      render(<Harness />);
      const shorter = screen.getByRole("button", { name: "Shorter F" });
      while (!(shorter as HTMLButtonElement).disabled) await userEvent.click(shorter);
      expect(screen.getByText(barsLabel(allowed[0]))).toBeInTheDocument();
    });

    it("stops at the longest allowed length", async () => {
      render(<Harness />);
      const longer = screen.getByRole("button", { name: "Longer F" });
      while (!(longer as HTMLButtonElement).disabled) await userEvent.click(longer);
      expect(
        screen.getByText(barsLabel(allowed[allowed.length - 1])),
      ).toBeInTheDocument();
    });
  },
);

describe("ProgressionPanel — transport and visibility", () => {
  it("disables Play when nothing can be played", () => {
    prime({ slots: [{ id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 }] });
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("plays with a stubbed AudioContext", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("renders nothing when hidden", () => {
    prime({ visible: false });
    render(<Harness />);
    expect(
      screen.queryByRole("region", { name: "Progression" }),
    ).not.toBeInTheDocument();
  });

  it("shows a hint under the All key", () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(
      screen.getByText("Pick a key to build and play a progression."),
    ).toBeInTheDocument();
  });

  it("disables Play under the All key", () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});

describe("ProgressionPanel — disabled while playing", () => {
  it("never leaves Stop disabled: switching to the All key stops playback", async () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    const { rerender } = render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
    await act(async () => {
      rerender(<Harness selectedKey={ALL_NOTES_KEY} />);
    });
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});

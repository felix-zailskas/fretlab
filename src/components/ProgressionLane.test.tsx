import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressionLane } from "./ProgressionLane";
import { PlayerTransport } from "./PlayerTransport";
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
      <PlayerTransport player={player} />
      <ProgressionLane player={player} noKey={selectedKey === ALL_NOTES_KEY} />
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

describe("ProgressionLane — slots", () => {
  it("takes no space while the progression is empty", () => {
    render(<Harness />);
    expect(
      screen.queryByRole("region", { name: "Progression" }),
    ).not.toBeInTheDocument();
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

  it("gives unplayable slots distinct accessible names", () => {
    prime({
      slots: [
        { id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 },
        { id: "y", ref: { tier: "secondary", degree: 1 }, bars: 1 },
      ],
    });
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: "Remove slot 1 from progression" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove slot 2 from progression" }),
    ).toBeInTheDocument();
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

describe("ProgressionLane — transport and visibility", () => {
  it("plays with an empty progression", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Progression" }),
    ).not.toBeInTheDocument();
  });

  it("plays when nothing on the strip resolves", async () => {
    prime({ slots: [{ id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 }] });
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
    "shows %s beat dots while playing",
    async (_label, preset) => {
      prime({ timeSignature: preset });
      render(<Harness />);
      const current = () =>
        screen
          .getAllByTestId("beat-dot")
          .filter((d) => d.getAttribute("data-current") === "true");
      expect(screen.getAllByTestId("beat-dot")).toHaveLength(preset.beats);
      expect(current()).toHaveLength(0);
      await userEvent.click(screen.getByRole("button", { name: "Play" }));
      expect(screen.getAllByTestId("beat-dot")).toHaveLength(preset.beats);
      expect(current()).toHaveLength(1);
    },
  );

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

  it("under the All key, the lane hides but the transport stays usable", () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect([
      screen.queryByRole("region", { name: "Progression" }) === null,
      screen.queryByTestId("progression-slot"),
      (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled,
      (screen.getByRole("spinbutton", { name: "BPM" }) as HTMLInputElement).disabled,
    ]).toEqual([true, null, false, false]);
  });

  it("plays the metronome under the All key", async () => {
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });
});

describe("ProgressionLane — switching to All while playing", () => {
  it("keeps playing and Stop still works", async () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    const { rerender } = render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    await act(async () => {
      rerender(<Harness selectedKey={ALL_NOTES_KEY} />);
    });
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});

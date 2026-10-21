import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransportControls } from "./TransportControls";
import { TIME_SIGNATURE_PRESETS, timeSignatureLabel } from "../theory/meter";

function renderControls(
  overrides: Partial<Parameters<typeof TransportControls>[0]> = {},
) {
  const props = {
    isPlaying: false,
    beatInBar: null,
    metronomeOnly: false,
    hasSlots: true,
    bpm: 90,
    timeSignature: { beats: 4, unit: 4 } as const,
    click: false,
    loop: true,
    onTogglePlay: vi.fn(),
    onBpmChange: vi.fn(),
    onTimeSignatureChange: vi.fn(),
    onClickChange: vi.fn(),
    onLoopChange: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<TransportControls {...props} />);
  return props;
}

describe("TransportControls — play", () => {
  it("enables Play even in metronome-only mode", () => {
    renderControls({ metronomeOnly: true, hasSlots: false });
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
  });

  it("shows Stop while playing", () => {
    renderControls({ isPlaying: true });
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
  });

  it("calls onTogglePlay", async () => {
    const props = renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1);
  });
});

describe("TransportControls — BPM", () => {
  it("does not commit while typing", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "12");
    expect(props.onBpmChange).not.toHaveBeenCalled();
  });

  it("commits on blur", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "120");
    await userEvent.tab();
    expect(props.onBpmChange).toHaveBeenCalledWith(120);
  });

  it("commits on Enter", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "150{Enter}");
    expect(props.onBpmChange).toHaveBeenCalledWith(150);
  });

  it.each([
    ["5", 30],
    ["999", 300],
  ])("clamps %s to %d", async (typed, expected) => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, typed);
    await userEvent.tab();
    expect([
      vi.mocked(props.onBpmChange).mock.calls[0][0],
      (input as HTMLInputElement).value,
    ]).toEqual([expected, String(expected)]);
  });

  it("reverts an empty value", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.tab();
    expect([
      vi.mocked(props.onBpmChange).mock.calls.length,
      (input as HTMLInputElement).value,
    ]).toEqual([0, "90"]);
  });

  it.each([["1e999"], ["-1e999"], ["e"], ["-"]])(
    "reverts a non-finite or garbage value (%s) without committing",
    async (typed) => {
      const props = renderControls();
      const input = screen.getByRole("spinbutton", { name: "BPM" });
      await userEvent.clear(input);
      await userEvent.type(input, typed);
      await userEvent.tab();
      expect([
        vi.mocked(props.onBpmChange).mock.calls.length,
        (input as HTMLInputElement).value,
      ]).toEqual([0, "90"]);
    },
  );
});

describe("TransportControls — time signature", () => {
  it("offers every preset", () => {
    renderControls();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(
      TIME_SIGNATURE_PRESETS.map(timeSignatureLabel),
    );
  });

  // Start each case from a *different* preset so the selection is a real change.
  it.each(
    TIME_SIGNATURE_PRESETS.map(
      (p, i, all) => [timeSignatureLabel(p), p, all[(i + 1) % all.length]] as const,
    ),
  )("selecting %s reports that preset", async (label, preset, initial) => {
    const props = renderControls({ timeSignature: initial });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Time signature" }),
      label,
    );
    expect(props.onTimeSignatureChange).toHaveBeenLastCalledWith(preset);
  });
});

describe("TransportControls — toggles", () => {
  it("Click reflects state and toggles", async () => {
    const props = renderControls({ click: false });
    const button = screen.getByRole("button", { name: "Click" });
    await userEvent.click(button);
    expect([
      button.getAttribute("aria-pressed"),
      vi.mocked(props.onClickChange).mock.calls[0][0],
    ]).toEqual(["false", true]);
  });

  it("Loop reflects state and toggles", async () => {
    const props = renderControls({ loop: true });
    const button = screen.getByRole("button", { name: "Loop" });
    await userEvent.click(button);
    expect([
      button.getAttribute("aria-pressed"),
      vi.mocked(props.onLoopChange).mock.calls[0][0],
    ]).toEqual(["true", false]);
  });

  it("Clear is disabled without slots", () => {
    renderControls({ hasSlots: false });
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });
});

describe("TransportControls — beat dots", () => {
  it("shows no dots while stopped", () => {
    renderControls({ isPlaying: false, beatInBar: null });
    expect(screen.queryAllByTestId("beat-dot")).toHaveLength(0);
  });

  it.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
    "shows one dot per beat of %s and fills the current one",
    (_label, preset) => {
      const current = preset.beats - 1;
      renderControls({ isPlaying: true, beatInBar: current, timeSignature: preset });
      const dots = screen.getAllByTestId("beat-dot");
      expect([
        dots.length,
        dots.findIndex((d) => d.getAttribute("data-current") === "true"),
      ]).toEqual([preset.beats, current]);
    },
  );
});

describe("TransportControls — metronome only", () => {
  const TITLE = "Click always sounds when no chords are playing";

  it("explains why Click has no effect", () => {
    renderControls({ metronomeOnly: true });
    expect(screen.getByRole("button", { name: "Click" })).toHaveAttribute(
      "title",
      TITLE,
    );
  });

  it("keeps Click usable", async () => {
    const props = renderControls({ metronomeOnly: true, click: false });
    await userEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(props.onClickChange).toHaveBeenCalledWith(true);
  });

  it("has no Click title with chords", () => {
    renderControls({ metronomeOnly: false });
    expect(screen.getByRole("button", { name: "Click" })).not.toHaveAttribute("title");
  });
});

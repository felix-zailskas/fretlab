import { useState } from "react";
import {
  TIME_SIGNATURE_PRESETS,
  accentPattern,
  timeSignatureLabel,
  type TimeSignature,
} from "../theory/meter";
import { BPM_MAX, BPM_MIN, clampBpm } from "../theory/progressionStorage";
import { BeatDots } from "./BeatDots";

type TransportControlsProps = {
  isPlaying: boolean;
  /** The beat of the current bar, or null while stopped. */
  beatInBar: number | null;
  metronomeOnly: boolean;
  hasSlots: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  click: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (sig: TimeSignature) => void;
  onClickChange: (enabled: boolean) => void;
  onLoopChange: (loop: boolean) => void;
  onClear: () => void;
};

const BUTTON =
  "px-3 py-1.5 pointer-coarse:py-3 rounded text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
const LABEL = "flex items-center gap-2 text-xs text-fg-muted uppercase tracking-wide";
const FIELD =
  "px-2 py-1 rounded border border-line bg-surface-raised text-fg-primary text-sm";

function toggleClass(on: boolean): string {
  return `${BUTTON} ${on ? "bg-surface-active text-fg-emphasis" : "bg-surface-raised text-fg-muted hover:text-fg-secondary"}`;
}

type BpmInputProps = {
  bpm: number;
  onCommit: (bpm: number) => void;
};

function BpmInput({ bpm, onCommit }: BpmInputProps) {
  const [draft, setDraft] = useState(String(bpm));

  function commit() {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(bpm));
      return;
    }
    const next = clampBpm(parsed);
    setDraft(String(next));
    onCommit(next);
  }

  return (
    <label className={LABEL}>
      BPM
      <input
        type="number"
        min={BPM_MIN}
        max={BPM_MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`w-16 ${FIELD}`}
      />
    </label>
  );
}

export function TransportControls(props: TransportControlsProps) {
  const { isPlaying, beatInBar, metronomeOnly, hasSlots, bpm, timeSignature } = props;
  const { click, loop } = props;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      <button
        type="button"
        onClick={props.onTogglePlay}
        className={`${BUTTON} min-w-[4.5rem] bg-surface-active text-fg-emphasis hover:bg-surface-raised`}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>
      <BpmInput key={bpm} bpm={bpm} onCommit={props.onBpmChange} />
      <label className={LABEL}>
        Time
        <select
          aria-label="Time signature"
          value={timeSignatureLabel(timeSignature)}
          onChange={(e) => {
            const sig = TIME_SIGNATURE_PRESETS.find(
              (p) => timeSignatureLabel(p) === e.target.value,
            );
            if (sig) props.onTimeSignatureChange(sig);
          }}
          className={FIELD}
        >
          {TIME_SIGNATURE_PRESETS.map((p) => {
            const label = timeSignatureLabel(p);
            return (
              <option key={label} value={label}>
                {label}
              </option>
            );
          })}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={click}
        title={
          metronomeOnly ? "Click always sounds when no chords are playing" : undefined
        }
        onClick={() => props.onClickChange(!click)}
        className={toggleClass(click)}
      >
        Click
      </button>
      <button
        type="button"
        aria-pressed={loop}
        onClick={() => props.onLoopChange(!loop)}
        className={toggleClass(loop)}
      >
        Loop
      </button>
      <button
        type="button"
        onClick={props.onClear}
        disabled={!hasSlots}
        className={`${BUTTON} text-fg-muted hover:text-fg-secondary`}
      >
        Clear
      </button>
      {isPlaying && beatInBar !== null && (
        <BeatDots
          source="transport"
          beats={timeSignature.beats}
          current={beatInBar}
          accents={accentPattern(timeSignature)}
        />
      )}
    </div>
  );
}

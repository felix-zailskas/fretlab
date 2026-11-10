import { useState } from "react";
import {
  PREVIEW_BEAT_OPTIONS,
  TIME_SIGNATURE_PRESETS,
  accentPattern,
  timeSignatureLabel,
  type TimeSignature,
} from "../theory/meter";
import { BPM_MAX, BPM_MIN, clampBpm } from "../theory/progressionStorage";
import { BeatDots } from "./BeatDots";
import { BUTTON, FIELD } from "./controlStyles";

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
  // Beats of next-chord preview; 0 is off.
  preview: number;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (sig: TimeSignature) => void;
  onClickChange: (enabled: boolean) => void;
  onLoopChange: (loop: boolean) => void;
  onPreviewChange: (previewBeats: number) => void;
  onClear: () => void;
};

function previewLabel(beats: number): string {
  if (beats === 0) return "No preview";
  return `Preview ${beats} ${beats === 1 ? "beat" : "beats"}`;
}

const LABEL = "flex items-center gap-1.5 text-xs text-fg-muted";

function toggleClass(on: boolean): string {
  return `${BUTTON} ${on ? "bg-surface-active text-fg-emphasis" : "bg-surface-raised text-fg-secondary hover:text-fg-emphasis"}`;
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
        aria-label="BPM"
        className={`w-14 ${FIELD}`}
      />
      BPM
    </label>
  );
}

export function TransportControls(props: TransportControlsProps) {
  const { isPlaying, beatInBar, metronomeOnly, hasSlots, bpm, timeSignature } = props;
  const { click, loop } = props;

  return (
    <div
      role="group"
      aria-label="Transport"
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-raised/40 p-1"
    >
      <button
        type="button"
        onClick={props.onTogglePlay}
        className={`${BUTTON} min-w-[3.75rem] bg-surface-active text-fg-emphasis hover:bg-surface-raised`}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>
      {/* Always rendered so starting playback doesn't shift the transport;
          dimmed while stopped, where it previews the meter. */}
      <span className={isPlaying ? undefined : "opacity-40"}>
        <BeatDots
          source="transport"
          beats={timeSignature.beats}
          current={isPlaying && beatInBar !== null ? beatInBar : -1}
          accents={accentPattern(timeSignature)}
        />
      </span>
      <BpmInput key={bpm} bpm={bpm} onCommit={props.onBpmChange} />
      <label className={LABEL}>
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
      <select
        aria-label="Preview next chord"
        title="How early the next chord's notes appear on the board"
        value={props.preview}
        onChange={(e) => props.onPreviewChange(Number(e.target.value))}
        className={FIELD}
      >
        {PREVIEW_BEAT_OPTIONS.map((beats) => (
          <option key={beats} value={beats}>
            {previewLabel(beats)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={props.onClear}
        disabled={!hasSlots}
        className={`${BUTTON} text-fg-muted hover:text-fg-secondary`}
      >
        Clear
      </button>
    </div>
  );
}

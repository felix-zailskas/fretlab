import type { ProgressionPlayer } from "../useProgressionPlayer";
import { TransportControls } from "./TransportControls";

// The header's transport, wired to the progression player.
export function PlayerTransport({ player }: { player: ProgressionPlayer }) {
  const { state } = player;
  return (
    <TransportControls
      isPlaying={player.isPlaying}
      beatInBar={player.isPlaying ? player.beatInBar : null}
      metronomeOnly={player.metronomeOnly}
      hasSlots={state.slots.length > 0}
      bpm={state.bpm}
      timeSignature={state.timeSignature}
      click={state.click}
      loop={state.loop}
      preview={state.preview}
      onTogglePlay={player.toggle}
      onBpmChange={player.setBpm}
      onTimeSignatureChange={player.setTimeSignature}
      onClickChange={player.setClick}
      onLoopChange={player.setLoop}
      onPreviewChange={player.setPreview}
      onClear={player.clear}
    />
  );
}

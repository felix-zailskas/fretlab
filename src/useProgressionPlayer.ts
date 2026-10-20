import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ALL_NOTES_KEY } from "./theory/notes";
import { createMetronome, type Metronome } from "./audio/metronome";
import { createTransport, type TransportSnapshot } from "./audio/transport";
import {
  resolveChordRef,
  type ChordRef,
  type ChordRowMode,
  type MapChord,
} from "./theory/harmony";
import {
  playbackTimeline,
  snapSlotLength,
  type TimeSignature,
  type TimelinePosition,
} from "./theory/meter";
import type { Mode } from "./theory/modes";
import {
  clampBpm,
  loadProgression,
  saveProgression,
  type ProgressionSlot,
  type StoredProgression,
} from "./theory/progressionStorage";
import { progressionReducer } from "./progressionReducer";

export type ResolvedSlot = { slot: ProgressionSlot; chord: MapChord | null };

export type UseProgressionPlayerOptions = {
  selectedKey: string;
  mode: Mode;
  rowMode: ChordRowMode;
  onChordChange: (ref: ChordRef) => void;
  metronomeFactory?: () => Metronome;
};

export type ProgressionPlayer = {
  state: StoredProgression;
  resolvedSlots: ResolvedSlot[];
  /** No slot is playable, so Play runs a plain metronome: one looping bar, click on. */
  metronomeOnly: boolean;
  isPlaying: boolean;
  currentSlot: number | null;
  nextSlot: number | null;
  beatInBar: number;
  add(ref: ChordRef): void;
  remove(id: string): void;
  move(from: number, to: number): void;
  setBars(id: string, bars: number): void;
  clear(): void;
  play(): void;
  stop(): void;
  toggle(): void;
  jumpTo(index: number): void;
  setBpm(bpm: number): void;
  setTimeSignature(sig: TimeSignature): void;
  setClick(enabled: boolean): void;
  setLoop(loop: boolean): void;
  setVisible(visible: boolean): void;
};

type PlaybackState = {
  isPlaying: boolean;
  currentSlotId: string | null;
  beatInBar: number;
};
type LiveState = TransportSnapshot & {
  playable: ProgressionSlot[];
  onChordChange: (ref: ChordRef) => void;
};

const IDLE: PlaybackState = { isPlaying: false, currentSlotId: null, beatInBar: 0 };

function createSlotId(): string {
  return `slot:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useProgressionPlayer({
  selectedKey,
  mode,
  rowMode,
  onChordChange,
  metronomeFactory = createMetronome,
}: UseProgressionPlayerOptions): ProgressionPlayer {
  const [state, dispatch] = useReducer(progressionReducer, undefined, loadProgression);
  const [transport] = useState(() => createTransport(metronomeFactory()));
  const [playback, setPlayback] = useState<PlaybackState>(IDLE);

  useEffect(() => {
    saveProgression(state);
  }, [state]);
  useEffect(() => () => transport.stop(), [transport]);

  const resolvedSlots = useMemo<ResolvedSlot[]>(
    () =>
      state.slots.map((slot) => ({
        slot,
        chord:
          selectedKey === ALL_NOTES_KEY
            ? null
            : resolveChordRef(slot.ref, selectedKey, mode, rowMode),
      })),
    [state.slots, selectedKey, mode, rowMode],
  );
  const playable = useMemo(
    () => resolvedSlots.filter((r) => r.chord !== null).map((r) => r.slot),
    [resolvedSlots],
  );
  const metronomeOnly = playable.length === 0;
  // A metronome never ends, whatever the Loop setting, and is never silent.
  const loop = state.loop || metronomeOnly;
  const audibleClick = state.click || metronomeOnly;
  const timeline = useMemo(
    () =>
      playbackTimeline(
        playable.map((s) => s.bars),
        state.timeSignature,
      ),
    [playable, state.timeSignature],
  );

  // Read by the transport on every beat, so edits made mid-play take effect
  // (including switching to metronome-only when the last chord goes away).
  const live = useRef<LiveState>({
    timeline,
    sig: state.timeSignature,
    loop,
    playable,
    onChordChange,
  });
  useEffect(() => {
    live.current = {
      timeline,
      sig: state.timeSignature,
      loop,
      playable,
      onChordChange,
    };
  }, [timeline, state.timeSignature, loop, playable, onChordChange]);
  useEffect(() => {
    transport.setClick(audibleClick);
  }, [transport, audibleClick]);
  const lastAnnounced = useRef<string | null>(null);

  const stop = useCallback(() => {
    transport.stop();
    setPlayback(IDLE);
  }, [transport]);

  const startFrom = useCallback(
    (slotId: string | null, sig: TimeSignature) => {
      const slots = playable.map((s) => ({ ...s, bars: snapSlotLength(s.bars, sig) }));
      const noChords = slots.length === 0;
      const startIndex = Math.max(
        0,
        slots.findIndex((s) => s.id === slotId),
      );
      const nextTimeline = playbackTimeline(
        slots.map((s) => s.bars),
        sig,
      );
      live.current = {
        ...live.current,
        timeline: nextTimeline,
        sig,
        loop: state.loop || noChords,
        playable: slots,
      };
      lastAnnounced.current = null;
      transport.start({
        bpm: state.bpm,
        click: state.click || noChords,
        startBeat: nextTimeline.starts[startIndex],
        snapshot: () => live.current,
        onPosition: (pos: TimelinePosition) => {
          // Empty in metronome-only mode: count the bar, announce nothing.
          const slot = live.current.playable[pos.slotIndex] ?? null;
          setPlayback({
            isPlaying: true,
            currentSlotId: slot?.id ?? null,
            beatInBar: pos.beatInBar,
          });
          if (slot && lastAnnounced.current !== slot.id) {
            lastAnnounced.current = slot.id;
            live.current.onChordChange(slot.ref);
          }
        },
        onEnd: () => setPlayback((p) => ({ ...p, isPlaying: false })),
      });
      setPlayback({
        isPlaying: true,
        currentSlotId: slots[startIndex]?.id ?? null,
        beatInBar: 0,
      });
    },
    [playable, state.bpm, state.click, state.loop, transport],
  );

  const play = useCallback(() => {
    startFrom(playable[0]?.id ?? null, state.timeSignature);
  }, [playable, startFrom, state.timeSignature]);

  // Chords became playable while the metronome runs (one was added, or the key
  // left "All"): restart on slot 0 right away. Done here, never from inside the
  // transport's callbacks — restarting the transport from its own frame leaks
  // a frame loop.
  const wasMetronomeOnly = useRef(metronomeOnly);
  useEffect(() => {
    const was = wasMetronomeOnly.current;
    wasMetronomeOnly.current = metronomeOnly;
    if (was && !metronomeOnly && playback.isPlaying) {
      startFrom(playable[0].id, state.timeSignature);
    }
  }, [metronomeOnly, playback.isPlaying, playable, startFrom, state.timeSignature]);

  const toggle = useCallback(() => {
    if (playback.isPlaying) stop();
    else play();
  }, [playback.isPlaying, play, stop]);

  const jumpTo = useCallback(
    (index: number) => {
      const target = resolvedSlots[index];
      if (!target || target.chord === null) return;
      onChordChange(target.slot.ref);
      if (playback.isPlaying) startFrom(target.slot.id, state.timeSignature);
    },
    [resolvedSlots, onChordChange, playback.isPlaying, startFrom, state.timeSignature],
  );

  const setTimeSignature = useCallback(
    (sig: TimeSignature) => {
      dispatch({ type: "set-time-signature", sig });
      if (!playback.isPlaying) return;
      startFrom(playback.currentSlotId ?? playable[0]?.id ?? null, sig);
    },
    [playback.isPlaying, playback.currentSlotId, playable, startFrom],
  );

  const setBpm = useCallback(
    (bpm: number) => {
      const next = clampBpm(bpm);
      dispatch({ type: "set-bpm", bpm: next });
      transport.setBpm(next);
    },
    [transport],
  );

  const setClick = useCallback(
    (enabled: boolean) => dispatch({ type: "set-click", enabled }),
    [],
  );

  const clear = useCallback(() => {
    stop();
    dispatch({ type: "clear" });
  }, [stop]);

  const add = useCallback(
    (ref: ChordRef) => dispatch({ type: "add", id: createSlotId(), ref }),
    [],
  );
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const move = useCallback(
    (from: number, to: number) => dispatch({ type: "move", from, to }),
    [],
  );
  const setBars = useCallback(
    (id: string, bars: number) => dispatch({ type: "set-bars", id, bars }),
    [],
  );
  const setLoop = useCallback(
    (loop: boolean) => dispatch({ type: "set-loop", loop }),
    [],
  );
  // Hiding the panel stops playback: no playing without a visible Stop.
  const setVisible = useCallback(
    (visible: boolean) => {
      if (!visible) stop();
      dispatch({ type: "set-visible", visible });
    },
    [stop],
  );

  const currentIndex = playback.isPlaying
    ? state.slots.findIndex((s) => s.id === playback.currentSlotId)
    : -1;
  const playablePos = playable.findIndex((s) => s.id === playback.currentSlotId);
  const nextPlayable =
    currentIndex === -1 || playablePos === -1
      ? undefined
      : (playable[playablePos + 1] ?? (state.loop ? playable[0] : undefined));
  const nextIndex =
    nextPlayable && nextPlayable.id !== playback.currentSlotId
      ? state.slots.findIndex((s) => s.id === nextPlayable.id)
      : -1;

  return {
    state,
    resolvedSlots,
    metronomeOnly,
    isPlaying: playback.isPlaying,
    currentSlot: currentIndex === -1 ? null : currentIndex,
    nextSlot: nextIndex === -1 ? null : nextIndex,
    beatInBar: playback.beatInBar,
    add,
    remove,
    move,
    setBars,
    clear,
    play,
    stop,
    toggle,
    jumpTo,
    setBpm,
    setTimeSignature,
    setClick,
    setLoop,
    setVisible,
  };
}

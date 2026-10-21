import type { ChordRef } from "./theory/harmony";
import { allowedSlotLengths, snapSlotLength, type TimeSignature } from "./theory/meter";
import { clampBpm, type StoredProgression } from "./theory/progressionStorage";

export type ProgressionAction =
  | { type: "add"; id: string; ref: ChordRef }
  | { type: "remove"; id: string }
  | { type: "move"; from: number; to: number }
  | { type: "set-bars"; id: string; bars: number }
  | { type: "clear" }
  | { type: "set-bpm"; bpm: number }
  | { type: "set-time-signature"; sig: TimeSignature }
  | { type: "set-click"; enabled: boolean }
  | { type: "set-loop"; loop: boolean }
  | { type: "set-visible"; visible: boolean };

export function progressionReducer(
  state: StoredProgression,
  action: ProgressionAction,
): StoredProgression {
  switch (action.type) {
    case "add":
      return {
        ...state,
        slots: [...state.slots, { id: action.id, ref: action.ref, bars: 1 }],
      };
    case "remove":
      return { ...state, slots: state.slots.filter((s) => s.id !== action.id) };
    case "move": {
      const { from, to } = action;
      const n = state.slots.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
      const slots = [...state.slots];
      const [moved] = slots.splice(from, 1);
      slots.splice(to, 0, moved);
      return { ...state, slots };
    }
    case "set-bars":
      if (!allowedSlotLengths(state.timeSignature).includes(action.bars)) return state;
      return {
        ...state,
        slots: state.slots.map((s) =>
          s.id === action.id ? { ...s, bars: action.bars } : s,
        ),
      };
    case "clear":
      return { ...state, slots: [] };
    case "set-bpm":
      return { ...state, bpm: clampBpm(action.bpm) };
    case "set-time-signature":
      return {
        ...state,
        timeSignature: action.sig,
        slots: state.slots.map((s) => ({
          ...s,
          bars: snapSlotLength(s.bars, action.sig),
        })),
      };
    case "set-click":
      return { ...state, click: action.enabled };
    case "set-loop":
      return { ...state, loop: action.loop };
    case "set-visible":
      return { ...state, visible: action.visible };
  }
}

import { naturalAccidentalForKeyMode, type Mode } from "./theory/modes";
import type { AccidentalStyle } from "./theory/notes";

export const ENHARMONIC_KEY_SWAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

export type TonalState = {
  key: string;
  mode: Mode;
  accidentalStyle: AccidentalStyle;
};

export type TonalAction =
  | { type: "set-key"; key: string }
  | { type: "set-mode"; mode: Mode }
  | { type: "set-accidental"; style: AccidentalStyle };

export function tonalReducer(state: TonalState, action: TonalAction): TonalState {
  switch (action.type) {
    case "set-key": {
      const natural = naturalAccidentalForKeyMode(action.key, state.mode);
      if (natural !== null && natural !== state.accidentalStyle) {
        const swapped = ENHARMONIC_KEY_SWAP[action.key] ?? action.key;
        return { key: swapped, mode: state.mode, accidentalStyle: natural };
      }
      return {
        key: action.key,
        mode: state.mode,
        accidentalStyle: state.accidentalStyle,
      };
    }
    case "set-mode": {
      const natural = naturalAccidentalForKeyMode(state.key, action.mode);
      if (natural !== null && natural !== state.accidentalStyle) {
        const swapped = ENHARMONIC_KEY_SWAP[state.key] ?? state.key;
        return { key: swapped, mode: action.mode, accidentalStyle: natural };
      }
      return { ...state, mode: action.mode };
    }
    case "set-accidental": {
      if (state.accidentalStyle === action.style) return state;
      const swapped = ENHARMONIC_KEY_SWAP[state.key] ?? state.key;
      return { key: swapped, mode: state.mode, accidentalStyle: action.style };
    }
  }
}

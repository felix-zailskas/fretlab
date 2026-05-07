import { useCallback, useState } from "react";
import type {
  Inversion,
  SeventhInversion,
  StringSet,
  VoicingSystem,
} from "../theory/chordShapes";

// Cross-system position labels: which physical string the bass note sits on.
//   low  — bass on string 6 (low E)
//   mid  — bass on string 5 (A)
//   high — bass on string 4 (D); only the adjacent-string systems have it
export type SeventhStringPosition = "low" | "mid" | "high";

// Hook bundling all selector state for the Chord Shapes view, lifted out so
// App.tsx owns the lifetime — survives tab switches as long as App stays
// mounted. Refresh resets to defaults; persistence (localStorage / URL) would
// be a follow-up swap of the inner useState calls.
export function useChordShapesState() {
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedInversions, setSelectedInversions] = useState<Set<Inversion>>(
    () => new Set<Inversion>(["root", "first", "second"]),
  );
  const [selectedVoicingSystem, setSelectedVoicingSystem] =
    useState<VoicingSystem>("drop2");
  const [selectedSeventhPositions, setSelectedSeventhPositions] = useState<
    Set<SeventhStringPosition>
  >(() => new Set<SeventhStringPosition>(["low"]));
  const [selectedSeventhInversions, setSelectedSeventhInversions] = useState<
    Set<SeventhInversion>
  >(() => new Set<SeventhInversion>(["root"]));

  const toggleStringSet = useCallback((id: StringSet) => {
    setSelectedStringSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleInversion = useCallback((id: Inversion) => {
    setSelectedInversions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSeventhPosition = useCallback((pos: SeventhStringPosition) => {
    setSelectedSeventhPositions((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  }, []);

  const toggleSeventhInversion = useCallback((id: SeventhInversion) => {
    setSelectedSeventhInversions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    selectedStringSets,
    toggleStringSet,
    selectedInversions,
    toggleInversion,
    selectedVoicingSystem,
    setSelectedVoicingSystem,
    selectedSeventhPositions,
    toggleSeventhPosition,
    selectedSeventhInversions,
    toggleSeventhInversion,
  };
}

export type ChordShapesControls = ReturnType<typeof useChordShapesState>;

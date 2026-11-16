import { useCallback, useState } from "react";
import { type PositionId } from "../theory/positions";
import { type ScaleType } from "../theory/pentatonic";

const DEFAULT_POSITIONS: PositionId[] = ["P1"];

export type ScalePositionsSlice = {
  positions: ReadonlySet<PositionId>;
  scaleType: ScaleType;
  showContext: boolean;
};

// Hook bundling Scale Positions selector state, lifted to App so the
// selection survives tab switches. `initial` comes from a share link.
export function useScalePositionsState(initial?: ScalePositionsSlice) {
  const [selectedPositions, setSelectedPositions] = useState<Set<PositionId>>(
    () => new Set(initial?.positions ?? DEFAULT_POSITIONS),
  );
  const [showContext, setShowContext] = useState(initial?.showContext ?? false);
  const [scaleType, setScaleType] = useState<ScaleType>(initial?.scaleType ?? "full");

  const load = useCallback((slice: ScalePositionsSlice) => {
    setSelectedPositions(new Set(slice.positions));
    setShowContext(slice.showContext);
    setScaleType(slice.scaleType);
  }, []);

  const togglePosition = useCallback((position: PositionId) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  }, []);

  return {
    selectedPositions,
    togglePosition,
    showContext,
    setShowContext,
    scaleType,
    setScaleType,
    load,
  };
}

export type ScalePositionsControls = ReturnType<typeof useScalePositionsState>;

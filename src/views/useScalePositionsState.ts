import { useCallback, useState } from "react";
import { type PositionId } from "../theory/positions";
import { type ScaleType } from "../theory/pentatonic";

const DEFAULT_POSITIONS: PositionId[] = ["P1"];

// Hook bundling Scale Positions selector state, lifted to App so the
// selection survives tab switches.
export function useScalePositionsState() {
  const [selectedPositions, setSelectedPositions] = useState<Set<PositionId>>(
    () => new Set(DEFAULT_POSITIONS),
  );
  const [showContext, setShowContext] = useState(false);
  const [scaleType, setScaleType] = useState<ScaleType>("full");

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
  };
}

export type ScalePositionsControls = ReturnType<typeof useScalePositionsState>;

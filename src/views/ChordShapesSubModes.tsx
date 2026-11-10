import { useMemo } from "react";
import { SegmentedRadio } from "../components/SegmentedRadio";
import { StringSetToggles } from "../components/StringSetToggles";
import { StringGroupIcon } from "../components/StringGroupIcon";
import { describeStringGroup } from "../components/stringGroups";
import { FIELD } from "../components/controlStyles";
import {
  VOICING_SYSTEM_ORDER,
  type ChordShapesMode,
  type Inversion,
  type SeventhInversion,
  type StringSet,
  type VoicingSystem,
} from "../theory/chordShapes";
import type {
  ChordShapesControls,
  SeventhStringPosition,
  VoicingStyle,
} from "./useChordShapesState";
import { STRING_SET_BY_POSITION } from "./chordShapesStringSets";

const VOICING_STYLE_OPTIONS: ReadonlyArray<{ id: VoicingStyle; label: string }> = [
  { id: "inversions", label: "Inversions" },
  { id: "caged", label: "CAGED" },
];

const VOICING_SYSTEM_LABELS: Record<VoicingSystem, string> = {
  close: "Close",
  drop2: "Drop 2",
  drop3: "Drop 3",
  "drop2-4": "Drop 2&4",
};

const INVERSION_OPTIONS: ReadonlyArray<{ id: Inversion; label: string }> = [
  { id: "root", label: "Root" },
  { id: "first", label: "1st" },
  { id: "second", label: "2nd" },
];

const SEVENTH_INVERSION_OPTIONS: ReadonlyArray<{
  id: SeventhInversion;
  label: string;
}> = [...INVERSION_OPTIONS, { id: "third", label: "3rd" }];

const TRIAD_STRING_SETS: readonly StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];

const POSITION_ORDER: SeventhStringPosition[] = ["low", "mid", "high"];

// String-set id ("6-4-3-2") → a fretboard-slice icon option.
function stringGroupOption<Id extends string>(id: Id, set: string) {
  const strings = set.split("-").map(Number);
  return {
    id,
    label: describeStringGroup(strings),
    icon: (active: boolean) => <StringGroupIcon strings={strings} active={active} />,
  };
}

const TRIAD_STRING_OPTIONS = TRIAD_STRING_SETS.map((set) =>
  stringGroupOption(set, set),
);

type ChordShapesSubModesProps = {
  mode: ChordShapesMode;
  controls: ChordShapesControls;
};

// "What am I studying" controls next to the view tabs. In CAGED the shape
// toggles live on the board (labels above it), so only the switch shows.
export function ChordShapesSubModes({ mode, controls }: ChordShapesSubModesProps) {
  const { selectedVoicingSystem, voicingStyle } = controls;

  // Labels follow the system's literal string set, but the click toggles the
  // underlying position so the choice persists across systems.
  const seventhPositionOptions = useMemo(() => {
    const map = STRING_SET_BY_POSITION[selectedVoicingSystem];
    return POSITION_ORDER.filter((p) => map[p] !== undefined).map((p) =>
      stringGroupOption(p, map[p]!),
    );
  }, [selectedVoicingSystem]);

  return (
    <>
      <SegmentedRadio
        options={VOICING_STYLE_OPTIONS}
        selected={voicingStyle}
        onChange={controls.setVoicingStyle}
        ariaLabel="Voicing style"
      />
      {voicingStyle === "inversions" && mode === "triads" && (
        <>
          <StringSetToggles
            options={TRIAD_STRING_OPTIONS}
            selected={controls.selectedStringSets}
            onToggle={controls.toggleStringSet}
            ariaLabel="String groups"
          />
          <StringSetToggles
            options={INVERSION_OPTIONS}
            selected={controls.selectedInversions}
            onToggle={controls.toggleInversion}
            ariaLabel="Inversions"
          />
        </>
      )}
      {voicingStyle === "inversions" && mode === "sevenths" && (
        <>
          <select
            aria-label="Voicing system"
            value={selectedVoicingSystem}
            onChange={(e) =>
              controls.setSelectedVoicingSystem(e.target.value as VoicingSystem)
            }
            className={`${FIELD} py-1.5 cursor-pointer`}
          >
            {VOICING_SYSTEM_ORDER.map((system) => (
              <option key={system} value={system}>
                {VOICING_SYSTEM_LABELS[system]}
              </option>
            ))}
          </select>
          <StringSetToggles
            options={seventhPositionOptions}
            selected={controls.selectedSeventhPositions}
            onToggle={controls.toggleSeventhPosition}
            ariaLabel="String groups"
          />
          <StringSetToggles
            options={SEVENTH_INVERSION_OPTIONS}
            selected={controls.selectedSeventhInversions}
            onToggle={controls.toggleSeventhInversion}
            ariaLabel="Inversions"
          />
        </>
      )}
    </>
  );
}

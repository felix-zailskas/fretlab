import type { ReactNode } from "react";
import { GROUP_MULTI, segmentClass } from "./controlStyles";

type Option<Id extends string> = {
  id: Id;
  label: string;
  // When set, rendered instead of the label; the label becomes the button's
  // accessible name and tooltip.
  icon?: (active: boolean) => ReactNode;
};

type StringSetTogglesProps<Id extends string> = {
  options: ReadonlyArray<Option<Id>>;
  selected: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  ariaLabel: string;
};

// Multi-select toggle group (dashed outline = pick several).
export function StringSetToggles<Id extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: StringSetTogglesProps<Id>) {
  return (
    <div className={GROUP_MULTI} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isOn = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            aria-pressed={isOn}
            aria-label={opt.icon ? opt.label : undefined}
            title={opt.icon ? opt.label : undefined}
            className={
              opt.icon
                ? `px-1.5 py-px pointer-coarse:py-2 cursor-pointer transition-colors ${
                    isOn ? "bg-surface-active" : "bg-surface hover:bg-surface-raised"
                  }`
                : segmentClass(isOn)
            }
          >
            {opt.icon ? opt.icon(isOn) : opt.label}
          </button>
        );
      })}
    </div>
  );
}

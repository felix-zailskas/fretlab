import type { ReactNode } from "react";
import { GROUP_MULTI, GROUP_MULTI_TIPPED, segmentClass } from "./controlStyles";
import { Tooltip } from "./Tooltip";

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
  const hasIcons = options.some((opt) => opt.icon);
  return (
    <div
      className={hasIcons ? GROUP_MULTI_TIPPED : GROUP_MULTI}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isOn = selected.has(opt.id);
        if (!opt.icon) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              aria-pressed={isOn}
              className={segmentClass(isOn)}
            >
              {opt.label}
            </button>
          );
        }
        const icon = opt.icon;
        return (
          <Tooltip key={opt.id} tip={opt.label}>
            {() => (
              <button
                type="button"
                onClick={() => onToggle(opt.id)}
                aria-pressed={isOn}
                aria-label={opt.label}
                className={`relative touch-target px-1.5 py-px pointer-coarse:py-1.5 cursor-pointer transition-colors ${
                  isOn ? "bg-surface-active" : "bg-surface hover:bg-surface-raised"
                }`}
              >
                {icon(isOn)}
              </button>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}

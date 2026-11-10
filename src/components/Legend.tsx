import { GROUP_MULTI_TIPPED } from "./controlStyles";
import { Tooltip } from "./Tooltip";
import type { HighlightableRole } from "../theory/types";

// Roles whose highlight is unavailable, each with the reason shown on its
// button.
export type DisabledRoles = ReadonlyMap<HighlightableRole, string>;

const LEGEND_ITEMS: {
  label: string;
  role: HighlightableRole;
  color: string;
  title: string;
}[] = [
  {
    label: "Root",
    role: "root",
    color: "var(--color-root)",
    title: "Root note (1st degree) — the chord's tonal center",
  },
  {
    label: "3rd",
    role: "third",
    color: "var(--color-third)",
    title: "Third — defines major (M3) or minor (m3) quality",
  },
  {
    label: "5th",
    role: "fifth",
    color: "var(--color-fifth)",
    title: "Fifth — perfect, diminished, or augmented",
  },
  {
    label: "7th",
    role: "seventh",
    color: "var(--color-seventh)",
    title: "Seventh — adds color (maj7, m7, 7, m7♭5)",
  },
];

type LegendProps = {
  enabledRoles: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: DisabledRoles;
};

export function Legend({ enabledRoles, onToggleRole, disabledRoles }: LegendProps) {
  return (
    <div className={GROUP_MULTI_TIPPED} role="group" aria-label="Highlight roles">
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        const reason = disabledRoles?.get(item.role);
        const button = (describedBy?: string) => (
          // aria-disabled rather than disabled keeps the button focusable, so
          // the reason is reachable by keyboard and announced as its description.
          <button
            type="button"
            onClick={reason ? undefined : () => onToggleRole(item.role)}
            title={reason ? undefined : item.title}
            aria-pressed={isEnabled}
            aria-disabled={reason ? true : undefined}
            aria-describedby={describedBy}
            className={`flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:py-3 text-sm font-semibold transition-colors ${
              reason
                ? "bg-surface text-fg-muted opacity-40 cursor-not-allowed"
                : isEnabled
                  ? "bg-surface-active text-fg-emphasis cursor-pointer"
                  : "bg-surface text-fg-muted hover:bg-surface-raised cursor-pointer"
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </button>
        );
        return reason ? (
          <Tooltip key={item.role} tip={reason}>
            {button}
          </Tooltip>
        ) : (
          <span key={item.role} className="inline-flex">
            {button()}
          </span>
        );
      })}
    </div>
  );
}

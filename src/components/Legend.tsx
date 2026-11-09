import type { HighlightableRole } from "../theory/types";

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
  disabledRoles?: Set<HighlightableRole>;
};

export function Legend({ enabledRoles, onToggleRole, disabledRoles }: LegendProps) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-dashed border-line-emphasis"
      role="group"
      aria-label="Highlight roles"
    >
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        const isDisabled = disabledRoles?.has(item.role) ?? false;
        const tooltip = isDisabled
          ? "Switch chord mode to Sevenths to enable the 7th highlight"
          : item.title;
        return (
          <span
            key={item.label}
            title={isDisabled ? tooltip : undefined}
            className={isDisabled ? "cursor-not-allowed" : undefined}
          >
            <button
              onClick={() => onToggleRole(item.role)}
              title={isDisabled ? undefined : tooltip}
              aria-pressed={isEnabled}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:py-3 text-sm font-semibold transition-colors ${
                isDisabled
                  ? "bg-surface text-fg-muted opacity-40 pointer-events-none"
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
          </span>
        );
      })}
    </div>
  );
}

import type { NoteDisplayRole } from "../theory/types";

export type HighlightableRole = Extract<
  NoteDisplayRole,
  "root" | "third" | "fifth" | "seventh"
>;

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
};

export function Legend({ enabledRoles, onToggleRole }: LegendProps) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="group"
      aria-label="Highlight roles"
    >
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        return (
          <button
            key={item.label}
            onClick={() => onToggleRole(item.role)}
            title={item.title}
            aria-pressed={isEnabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              isEnabled
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

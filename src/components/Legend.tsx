import type { NoteDisplayRole } from "../theory/types";

export type HighlightableRole = Extract<
  NoteDisplayRole,
  "root" | "third" | "fifth" | "seventh"
>;

const LEGEND_ITEMS: { label: string; role: HighlightableRole; color: string }[] = [
  { label: "Root", role: "root", color: "var(--color-root)" },
  { label: "3rd", role: "third", color: "var(--color-third)" },
  { label: "5th", role: "fifth", color: "var(--color-fifth)" },
  { label: "7th", role: "seventh", color: "var(--color-seventh)" },
];

type LegendProps =
  | {
      readOnly: true;
    }
  | {
      readOnly?: false;
      enabledRoles: Set<HighlightableRole>;
      onToggleRole: (role: HighlightableRole) => void;
    };

export function Legend(props: LegendProps) {
  if (props.readOnly) {
    // Static color reference — no click handlers, all swatches always lit.
    return (
      <div className="flex gap-3 text-sm">
        {LEGEND_ITEMS.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-secondary">{item.label}</span>
          </span>
        ))}
      </div>
    );
  }

  // Interactive mode — click toggles the role's display.
  const { enabledRoles, onToggleRole } = props;
  return (
    <div className="flex gap-3 text-sm">
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        return (
          <button
            key={item.label}
            onClick={() => onToggleRole(item.role)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
              isEnabled ? "opacity-100" : "opacity-40"
            }`}
            aria-pressed={isEnabled}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-secondary">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

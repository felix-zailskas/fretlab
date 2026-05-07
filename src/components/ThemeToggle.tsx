type ThemeToggleProps = {
  mode: "auto" | "light" | "dark";
  onCycle: () => void;
};

export function ThemeToggle({ mode, onCycle }: ThemeToggleProps) {
  const label = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark";
  return (
    <button
      type="button"
      onClick={onCycle}
      className="px-3 py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
    >
      {label}
    </button>
  );
}

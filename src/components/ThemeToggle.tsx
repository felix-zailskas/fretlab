import { useEffect, useState } from "react";

type ThemeToggleProps = {
  mode: "auto" | "light" | "dark";
  onCycle: () => void;
};

export function ThemeToggle({ mode, onCycle }: ThemeToggleProps) {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const label =
    mode === "auto"
      ? `Auto · ${systemDark ? "Dark" : "Light"}`
      : mode === "light"
        ? "Light"
        : "Dark";

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

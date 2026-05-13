import { useEffect, useRef, useState } from "react";
import { CHROMATIC_SCALE, type ChromaticNote } from "../theory/notes";

type SixStrings = readonly [
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
];

type CustomTuningModalProps = {
  mode: "create" | "edit";
  initialName: string;
  initialStrings: SixStrings;
  onSave: (name: string, strings: SixStrings) => void;
  onSaveCopy: (name: string, strings: SixStrings) => void;
  onDelete: () => void;
  onCancel: () => void;
};

const DELETE_CONFIRM_MS = 3000;

export function CustomTuningModal({
  mode,
  initialName,
  initialStrings,
  onSave,
  onSaveCopy,
  onDelete,
  onCancel,
}: CustomTuningModalProps) {
  const [name, setName] = useState(initialName);
  const [strings, setStrings] = useState<SixStrings>(initialStrings);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  function updateString(i: number, value: ChromaticNote) {
    const next = [...strings] as [
      ChromaticNote,
      ChromaticNote,
      ChromaticNote,
      ChromaticNote,
      ChromaticNote,
      ChromaticNote,
    ];
    next[i] = value;
    setStrings(next);
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    onSave(name, strings);
  }

  function handleSaveCopy() {
    onSaveCopy(name, strings);
  }

  function handleDeleteClick() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      deleteTimerRef.current = window.setTimeout(() => {
        setDeleteArmed(false);
        deleteTimerRef.current = null;
      }, DELETE_CONFIRM_MS);
      return;
    }
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    onDelete();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Custom tuning"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        data-testid="modal-backdrop"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeIn_200ms_ease-out]"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-96 max-w-[calc(100vw-2rem)] p-6 rounded-xl border border-line bg-surface-raised shadow-xl motion-safe:animate-[modalEnter_220ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-[fadeIn_220ms_ease-out]"
      >
        <h2 className="text-lg font-semibold text-fg-emphasis mb-4">
          {mode === "create" ? "New custom tuning" : "Edit custom tuning"}
        </h2>

        <label className="block mb-4">
          <span className="block text-xs text-fg-muted uppercase tracking-wide mb-1">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface border border-line text-fg-emphasis"
            autoFocus
          />
        </label>

        <div className="mb-6">
          <span className="block text-xs text-fg-muted uppercase tracking-wide mb-2">
            Strings (low → high)
          </span>
          <div className="flex gap-2">
            {strings.map((note, i) => (
              <select
                key={i}
                value={note}
                onChange={(e) => updateString(i, e.target.value as ChromaticNote)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                aria-label={`String ${i + 1}`}
                className="min-w-[3.5ch] px-2 py-2 rounded bg-surface border border-line text-fg-emphasis font-mono"
              >
                {CHROMATIC_SCALE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              {deleteArmed ? "Click again to confirm" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <button
                type="button"
                onClick={handleSaveCopy}
                className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
              >
                Save as copy
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded text-sm font-semibold bg-surface-active text-fg-emphasis hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

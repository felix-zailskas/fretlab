import { Fragment, useEffect, useRef, useState } from "react";
import {
  TUNINGS,
  TUNING_GROUPS,
  type AnyTuningId,
  type CustomTuning,
  type CustomTuningId,
  type TuningId,
} from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: AnyTuningId;
  customs: readonly CustomTuning[];
  onTuningChange: (id: AnyTuningId) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (id: CustomTuningId) => void;
};

function isCustomId(id: AnyTuningId): id is CustomTuningId {
  return id.startsWith("custom:");
}

function resolveName(id: AnyTuningId, customs: readonly CustomTuning[]): string {
  if (isCustomId(id)) {
    return customs.find((c) => c.id === id)?.name ?? "Standard";
  }
  return TUNINGS[id as TuningId].name;
}

export function TuningSelector({
  tuningId,
  customs,
  onTuningChange,
  onOpenCreateModal,
  onOpenEditModal,
}: TuningSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        e.target instanceof Node &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSelect(id: AnyTuningId) {
    onTuningChange(id);
    setOpen(false);
  }

  function handleCreate() {
    setOpen(false);
    onOpenCreateModal();
  }

  const activeName = resolveName(tuningId, customs);
  const editDisabled = !isCustomId(tuningId);

  return (
    <div className="relative flex items-center gap-2" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Tuning: {activeName} ▾
      </button>
      <button
        type="button"
        onClick={() => {
          if (!editDisabled) onOpenEditModal(tuningId as CustomTuningId);
        }}
        aria-disabled={editDisabled}
        aria-label="Edit tuning"
        title={editDisabled ? "Select a custom tuning to edit" : "Edit tuning"}
        className={`px-2.5 py-2.5 pointer-coarse:py-3 rounded text-sm bg-surface-raised text-fg-secondary transition-transform active:scale-[0.97] ${
          editDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-surface-active cursor-pointer"
        }`}
      >
        ✎
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Tuning"
          data-popover
          className="absolute right-0 top-full mt-2 z-10 w-80 max-w-[calc(100vw-1rem)] p-1 rounded-lg border border-line bg-surface-raised shadow-lg origin-top-right max-h-[70vh] overflow-y-auto"
        >
          {TUNING_GROUPS.map((group, groupIdx) => (
            <Fragment key={group.category}>
              <div
                className={`px-3 pb-1 text-xs uppercase tracking-wide text-fg-muted font-semibold ${
                  groupIdx === 0 ? "pt-2" : "pt-3"
                }`}
                role="presentation"
              >
                {group.label}
              </div>
              {group.ids.map((id) => {
                const isActive = id === tuningId;
                const tuning = TUNINGS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded text-sm cursor-pointer ${
                      isActive
                        ? "bg-surface-active text-fg-emphasis font-semibold"
                        : "text-fg-secondary hover:bg-surface-active"
                    }`}
                  >
                    <span>{tuning.name}</span>
                    <span className="font-mono text-xs text-fg-faint tabular-nums">
                      {tuning.strings.join(" ")}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
          {customs.length > 0 && (
            <Fragment>
              <div
                className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-fg-muted font-semibold"
                role="presentation"
              >
                Custom
              </div>
              {[...customs]
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((c) => {
                  const isActive = c.id === tuningId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(c.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded text-sm cursor-pointer ${
                        isActive
                          ? "bg-surface-active text-fg-emphasis font-semibold"
                          : "text-fg-secondary hover:bg-surface-active"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="font-mono text-xs text-fg-faint tabular-nums">
                        {c.strings.join(" ")}
                      </span>
                    </button>
                  );
                })}
            </Fragment>
          )}
          <div className="border-t border-line my-1" role="presentation" />
          <button
            type="button"
            role="option"
            aria-selected={false}
            onClick={handleCreate}
            className="w-full flex items-center justify-start px-3 py-2 rounded text-sm cursor-pointer text-fg-secondary hover:bg-surface-active"
          >
            + New custom tuning…
          </button>
        </div>
      )}
    </div>
  );
}

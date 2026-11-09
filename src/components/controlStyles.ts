// Shared sizing for the control vocabulary: 32px tall with 14px text
// (the common "compact default" — Material dense, GitHub, Linear). Secondary
// text (legend names, hints) is 12px. Coarse pointers (touch) get extra
// vertical padding so targets reach ~44px.

export const CONTROL_TEXT = "text-sm font-semibold";

export const CONTROL_PAD = "px-3 py-1.5 pointer-coarse:py-3";

// Outline of a control group. Single-choice groups are solid; multi-select
// groups are dashed so the two behaviours read differently at a glance.
export const GROUP_SINGLE = "inline-flex rounded overflow-hidden border border-line";
export const GROUP_MULTI =
  "inline-flex rounded overflow-hidden border border-dashed border-line-emphasis";

export function segmentClass(on: boolean): string {
  return `${CONTROL_PAD} ${CONTROL_TEXT} whitespace-nowrap transition-colors cursor-pointer ${
    on
      ? "bg-surface-active text-fg-emphasis"
      : "bg-surface text-fg-muted hover:bg-surface-raised"
  }`;
}

export const BUTTON = `${CONTROL_PAD} ${CONTROL_TEXT} rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`;

// Key / mode dropdowns: the focal choices.
export const HEADER_SELECT =
  "pl-2.5 pr-1 py-1.5 pointer-coarse:py-3 rounded border border-line-emphasis bg-surface-raised text-fg-primary text-sm font-semibold cursor-pointer hover:border-line-hover";

export const FIELD =
  "px-2 py-1 pointer-coarse:py-2.5 rounded border border-line bg-surface-raised text-fg-primary text-sm font-semibold";

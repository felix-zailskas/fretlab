// Shared sizing for the control vocabulary: 32px tall with 14px text
// (the common "compact default" — Material dense, GitHub, Linear). Secondary
// text (legend names, hints) is 12px. Coarse pointers (touch) draw controls
// 36px tall and extend the tap area to 44px with the touch-target utility
// (index.css). Native selects can't carry that extra area, so they're 36px.

export const CONTROL_TEXT = "text-sm font-semibold";

export const CONTROL_PAD = "px-3 py-1.5 pointer-coarse:py-2 relative touch-target";

// Outline of a control group. Single-choice groups are solid; multi-select
// groups are dashed so the two behaviours read differently at a glance.
// No overflow-hidden (it would clip touch tap areas): the end buttons round
// their own corners, also when wrapped in a tooltip span.
const ROUND_ENDS =
  "[&>:first-child]:rounded-l [&>:last-child]:rounded-r [&>:first-child>button]:rounded-l [&>:last-child>button]:rounded-r";
export const GROUP_SINGLE = `inline-flex rounded border border-line ${ROUND_ENDS}`;
export const GROUP_MULTI = `inline-flex rounded border border-dashed border-line-emphasis ${ROUND_ENDS}`;
// Multi-select group whose buttons carry tooltips (no clipping, as above).
export const GROUP_MULTI_TIPPED = GROUP_MULTI;

// A trigger inside the settings panel. Outlined on the page background so it
// stands out from the raised panel behind it.
export const SETTINGS_TRIGGER =
  "px-3 py-1.5 pointer-coarse:py-2 relative touch-target rounded border border-line bg-surface text-sm font-semibold text-fg-secondary hover:bg-surface-active cursor-pointer";

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
  "pl-2.5 pr-1 py-1.5 pointer-coarse:py-2 rounded border border-line-emphasis bg-surface-raised text-fg-primary text-sm font-semibold cursor-pointer hover:border-line-hover";

export const FIELD =
  "px-2 py-1 pointer-coarse:py-2 rounded border border-line bg-surface-raised text-fg-primary text-sm font-semibold";

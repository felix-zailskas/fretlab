import { useState } from "react";
import type { SearchPage } from "../searchPages/pages";
import { ALL_NOTES_KEY } from "../theory/notes";

type TopicStripProps = {
  page: SearchPage;
  selectedKey: string;
  onPickKey: () => void;
  onDismiss: () => void;
};

// The intro shown on a topic page (e.g. /scales/minor-pentatonic/e-shape):
// the page's h1 and a one- or two-sentence answer, embedded between the
// header and the view so it never covers the board. On phones only the
// heading shows until "more" is pressed.
export function TopicStrip({
  page,
  selectedKey,
  onPickKey,
  onDismiss,
}: TopicStripProps) {
  const [expanded, setExpanded] = useState(false);
  // "All notes" has no key to describe: explain the page's own default.
  const noKey = selectedKey === ALL_NOTES_KEY;
  return (
    <section
      data-testid="topic-strip"
      aria-labelledby="topic-heading"
      className="flex items-start gap-3 rounded border border-line bg-surface-raised px-3 py-2 mb-3 text-sm"
    >
      <div className="min-w-0 flex-1">
        <h1 id="topic-heading" className="inline font-semibold text-fg-primary">
          {page.heading}
        </h1>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label="More about this topic"
          className="md:hidden ml-2 text-fg-muted underline cursor-pointer"
        >
          {expanded ? "less" : "more"}
        </button>
        <p
          className={`${expanded ? "block" : "hidden"} md:inline md:ml-2 text-fg-secondary`}
        >
          {page.answer(noKey ? page.defaultKey : selectedKey)}{" "}
          <button
            type="button"
            onClick={onPickKey}
            className="text-fg-primary underline cursor-pointer"
          >
            {noKey
              ? "Showing all notes, pick a key"
              : `Showing ${selectedKey}, pick any key`}
          </button>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide topic intro"
        className="shrink-0 px-1.5 text-fg-muted hover:text-fg-primary cursor-pointer"
      >
        ×
      </button>
    </section>
  );
}

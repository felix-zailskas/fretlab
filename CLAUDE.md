# Fretlab

## Development work

When working on changes in this repository make sure to adhere to the guidelines laid
out in the [CONTRIBUTING.md](./CONTRIBUTING.md)

## Before Every Commit

ALWAYS run the following before committing:

```bash
npm run lint            # ESLint — auto-fix with --fix if needed
npx prettier --write .  # Format all files
npm test                # Run the test suite
```

These are also enforced by the pre-commit hook (husky + lint-staged), but running them
manually first avoids surprises.

## Testing

Two-tier split:

- **Fast tier — runs in pre-commit and CI via `npm test`:**
  - Theory/unit tests in `src/theory/*.test.ts` (node env).
  - Component tests in `src/components/*.test.tsx` (jsdom env, React Testing Library).
- **Slow tier — runs in CI only via `npm run test:e2e`:**
  - Playwright E2E in `tests/e2e/*.spec.ts`. **Do NOT add Playwright tests to
    pre-commit.**

Use the `data-testid` / `data-*` hooks already on `Fretboard` (`note-marker`,
`position-window` with `data-string` / `data-fret` / `data-note` / `data-low` /
`data-high` / `data-label`) for E2E assertions; add similar hooks to other rendered
elements as needed rather than asserting on visual layout.

When testing registries (e.g., `TUNINGS`), iterate the registry rather than enumerating
items so adding a new entry auto-extends coverage with zero test edits.

## GitHub Actions

Always pin actions to a full commit SHA, not a mutable tag:

```yaml
# Good
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# Bad
- uses: actions/checkout@v4
```

Add the version tag as a comment so the pin is still human-readable.

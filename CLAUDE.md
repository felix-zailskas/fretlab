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

## Project Structure

```
src/
  theory/         # Pure music-theory functions and types (no React)
  components/     # Shared UI components (Fretboard, Legend, controls …)
  views/          # One file per tab/view (NoteMapView, ScalePositionsView, …)
  App.tsx         # Root layout, shared state, view routing
  main.tsx        # React entry point

docs/
  design/         # Vision and per-view design notes
  superpowers/
    specs/        # Feature spec files (research output, committed to source control)
    plans/        # Implementation plans tracked task-by-task (committed to source control)
  practice/       # Structured practice plans that utilize the application
```

**Conventions:**

- Theory logic lives exclusively in `src/theory/`. Views and components must not
  reimplement music-theory calculations inline.
- Every theory module with non-trivial logic has a matching `.test.ts` file.
- Components are kept generic and reusable; view-specific glue stays in the view file.
- File names use PascalCase for React components (`FretboardString.tsx`) and camelCase
  for plain TypeScript modules (`chordTones.ts`).

## Style Guide

### TypeScript

- Strict mode is enabled. All types must be explicit at module boundaries; avoid `any`.
- Prefer `type` aliases over `interface` for plain data shapes; use `interface` only
  when extension or declaration merging is intentional.
- Prefer named exports. Default exports are only used for the top-level React component
  in a view or component file.

### React / TSX

- Functional components only — no class components.
- Keep components small and focused. If a component grows past ~150 lines, consider
  splitting it.
- Shared state lives in `App.tsx` and is passed down via props; avoid introducing a
  global state library unless the existing pattern genuinely breaks down.
- No inline styles — use Tailwind utility classes only.

### Tailwind

- Color tokens are defined via `@theme` in `src/index.css` and represent semantic roles
  (root, third, fifth, seventh, muted). Use those tokens rather than raw Tailwind
  palette colors wherever interval coloring is involved.
- Do not hardcode hex or rgb values in JSX.

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

# Contributing

## Before Every Commit

Always run the following before committing:

```bash
npm run lint            # ESLint — auto-fix with --fix if needed
npx prettier --write .  # Format all files
npm test                # Run the test suite
```

These are also enforced automatically by the pre-commit hook, but running them manually
first avoids surprises at commit time.

## Tooling

- **Prettier** — formats all file types on save (VS Code) and at commit time
- **ESLint** — lints and auto-fixes TypeScript/TSX/JS on save and at commit time
- **husky + lint-staged** — runs ESLint and Prettier on staged files at commit
- **tsc** — type-checks the project at commit time
- **vitest** — runs the full test suite at commit time

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

### Testing

Fretlab uses a **two-tier test split** sized to feedback cost:

**Tier 1 — fast (pre-commit + CI):** vitest runs both pure-logic unit tests and React
component tests in a single command (`npm test`).

- **Unit / theory tests** — `src/theory/<module>.test.ts`. Node environment. Test pure
  functions directly; do not mount React.
- **Component tests** — `src/components/<Component>.test.tsx`. jsdom environment via
  React Testing Library + `@testing-library/jest-dom`. Use `getByRole` / `getByText`
  over CSS or `data-testid` selectors.

The split is configured in `vitest.config.ts` via `environmentMatchGlobs`.
`window.matchMedia` is stubbed in `vitest.setup.ts` for components that read system
color-scheme preference.

**Tier 2 — slow (CI only, NOT pre-commit):** Playwright E2E tests in
`tests/e2e/<scenario>.spec.ts`. Each test boots a real browser; including them in
pre-commit would make every commit slow. CI runs them in a separate `e2e` job parallel
to the main `ci` job.

Run locally with `npm run test:e2e` (or `npm run test:e2e:ui` for the interactive
runner). Browsers must be installed once with `npx playwright install chromium`.

**When to use which tier:**

- Pure theory function → unit test.
- Single component's behavior (rendering, props, events) → RTL component test.
- Integration bug crossing component boundaries — especially anything where a
  parameterized function is called with a hardcoded value at the call site — →
  Playwright E2E test. The Fretboard exposes `data-testid="note-marker"`,
  `data-testid="position-window"`, plus per-marker `data-string` / `data-fret` /
  `data-note` and per-window `data-low` / `data-high` / `data-label` for test
  assertions; add similar `data-*` hooks to other rendered elements as needed rather
  than asserting on visual layout.

**Conventions:**

- Tests live alongside the module they cover (`foo.ts` → `foo.test.ts`, `Foo.tsx` →
  `Foo.test.tsx`).
- For tests over registries (e.g., `TUNINGS`), iterate the registry rather than
  enumerating items. Pre-fill any per-element fixture data so adding a new entry doesn't
  require multi-file edits.
- Aim for one assertion per `it()` block. Group related cases with `describe()`.

## GitHub Actions

All actions must be pinned to a full commit SHA rather than a mutable tag:

```yaml
# Good
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# Bad
- uses: actions/checkout@v4
```

Add the version tag as a trailing comment so the pin remains human-readable. This
prevents a compromised upstream tag from silently changing the code that runs in CI.

## Reference Documents

When a contribution adds or changes user-visible behavior, the following documents must
be kept up to date in the same PR:

- **README.md** — feature descriptions under the relevant view section
- **`docs/design/`** — the relevant design note, or a new one if the view/feature is new

Outdated docs are treated as a bug.

## For Agents

This project follows a structured **research → plan → implement** workflow powered by
the [Superpowers plugin](https://github.com/obra/superpowers) for Claude Code.
Contributions from agents must follow this convention.

### Workflow

1. **Specify** — use `superpowers:brainstorming` explore requirements, constraints, and
   design options. The output is a spec file.
2. **Plan** — use `superpowers:writing-plans` to break the spec into concrete, ordered
   implementation tasks. The output is a plan file.
3. **Implement** — use `superpowers:executing-plans` /
   `superpowers:subagent-driven-development` to execute the plan phase by phase.

### Committing Spec and Plan Files

Spec and plan files are **first-class artifacts** and must be committed to source
control alongside the code that implements them:

- Specs go in `docs/superpowers/specs/` with the naming pattern
  `YYYY-MM-DD-<feature>-design.md`
- Plans go in `docs/superpowers/plans/` with the naming pattern
  `YYYY-MM-DD-<feature>.md`

Do not delete or gitignore these files after the feature ships — they serve as a
decision log.

### Keeping Reference Docs Current

After implementation, before creating a PR or committing, verify that README.md and any
affected design notes reflect the new behavior. Use
`superpowers:verification-before-completion` to confirm everything is consistent before
claiming work is done.

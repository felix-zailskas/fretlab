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

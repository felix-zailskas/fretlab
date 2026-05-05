# Fretlab

## Before Every Commit

ALWAYS run the following before committing:

```bash
npm run lint            # ESLint — auto-fix with --fix if needed
npx prettier --write .  # Format all files
npm test                # Run the test suite
```

These are also enforced by the pre-commit hook (husky + lint-staged), but running them
manually first avoids surprises.

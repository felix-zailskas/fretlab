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

## GitHub Actions

Always pin actions to a full commit SHA, not a mutable tag:

```yaml
# Good
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# Bad
- uses: actions/checkout@v4
```

Add the version tag as a comment so the pin is still human-readable.

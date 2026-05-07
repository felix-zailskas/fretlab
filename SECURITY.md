# Security policy

## Reporting a vulnerability

Fretlab is a static, client-only web app — there's no server, no auth, no user data
leaving the browser. The realistic risks are dependency vulnerabilities and XSS surface
inside the build.

If you discover a vulnerability:

- **Do not open a public issue.**
- Email **felixzailskas@gmail.com** with a short description, steps to reproduce, and
  the impact you observed.
- Alternatively, use GitHub's private vulnerability reporting at
  https://github.com/felix-zailskas/fretlab/security/advisories/new.

Expect an acknowledgement within 7 days. A fix and disclosure plan will follow as
quickly as the scope allows; for a single-maintainer project that usually means within
30 days for confirmed issues.

## Supported versions

Only the latest commit on `main` is supported. There are no LTS branches.

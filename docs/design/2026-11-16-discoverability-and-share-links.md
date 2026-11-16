# Discoverability, share links and search pages: working notes

Status: **discussion notes, not an approved design.** Captures decisions made so far so
the work can resume in a later session. A full design doc follows before any code.

## Goal

More people using Fretlab. Entry points, in priority order:

1. **Teachers sharing an exact view** with students.
2. **Creator links** (YouTube descriptions etc.). Same mechanism as 1 plus a `ref` tag.
3. **Google / AI search**, targeting concrete searches like "minor pentatonic e shape",
   "major triads strings 2-3-4", "drop 2 maj7".

## Already done

- SEO basics on `index.html`: title, meta description, canonical, Open Graph / Twitter
  cards, `og-image.png`, WebApplication JSON-LD, `<noscript>` text, `robots.txt`,
  `sitemap.xml`.
- After deploy (manual): verify the site in Google Search Console and Bing Webmaster
  Tools, submit the sitemap, request indexing of `/`.

## Decisions so far

### Two layers: path = _what_ it is, query = _which version and how it's shown_

- Only paths are indexed. Query variants carry a canonical tag back to their path.
- Search pages are concept-first, not key × mode × view: people search shapes without a
  key. One page per concept, sensible default key, key picker via `?key=`.
- A specific key gets its own page only if Search Console shows demand (one data line).

### Paths (draft)

| Path                              | Values                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/`                               | the app                                                                                                |
| `/scales/{scale}/{position}`      | scale: `minor-pentatonic`, `major-pentatonic`, 7 modes; position: `e-shape`…`g-shape`, `all-positions` |
| `/chords/triads/{quality}/{set}`  | `major`/`minor`/`diminished` × `strings-1-2-3`…`strings-4-5-6`                                         |
| `/chords/{voicing}/{type}`        | `close`/`drop-2`/`drop-3`/`drop-2-4` × `maj7`/`m7`/`7`/`m7b5`                                          |
| `/chords/caged/{quality}/{shape}` | `major`/`minor` × `e-shape`…`g-shape`                                                                  |

Roughly 80–100 pages. Page copy names all synonyms (P1 = E shape = box 1 = position 1).
Each page: short direct answer, static fretboard picture rendered from the real
Fretboard component, key picker, "Open in Fretlab" (a share link), related links.

### Query params (draft; defaults omitted from URLs)

`view` (notes|scales|shapes), `key` (spelling sets ♭/♯), `mode`, `chord` (`d1`–`d7`,
`s2`–`s6`, `b1`–`b7`, `none`), `set` (triads|sevenths), `hl` (r,3,5,7), `str` (1–6),
`frets` (`start-end`), `tune` (built-in id or custom notes `D-A-D-G-A-D`), `pos` (P1–P5
list), `pent`, `ctx`, `inv`, `ss`, `voice`, `bass`, `inv7`, `style`, `caged`, `ref`
(creator credit, no effect on view), `prog` (progression, e.g. `d2:1,d5:1,d1:2`), `name`
(progression name). Theme is never in the URL.

### Resolution

- One parser: defaults → path → query params → single app state. URL is always
  re-serialized from state; `parse(serialize(state)) === state` is tested.
- While state still matches the page's topic, keep the path and update the query. Once
  the user changes something the path fixes (scale, position, tab), switch to `/?…` with
  the full query.
- URL updates use replaceState; only tab switches push history.
- Invalid or contradictory params fall back to defaults; never crash. Existing rules
  (e.g. pentatonic only in Ionian/Aeolian) apply on load.
- Published names never change; renamed values stay accepted as aliases. Registry
  round-trip tests iterate the registries.
- URL length is a non-issue: worst case ~300–400 chars, typical 40–100.

### Storage

- URL is the source of truth; localStorage is "resume where I left off" when opening
  bare `/`.
- A link carrying a progression loads it and **adds it to the local library as a new
  entry** (dedupe by content; never overwrites the user's own entries).
- The links project writes storage in a format that already supports multiple named
  entries, but only exposes "current progression".

### Hosting / build

- GitHub Pages: paths need real files, so search pages are **pre-rendered at build
  time** into `dist/` (nothing generated is committed). Router for in-app navigation +
  build-time prerender. Candidates: React Router v7 `prerender`, `vite-react-ssg`, or a
  small custom `renderToString` script. Not chosen yet.
- `sitemap.xml` becomes generated from the page list at build time.

## Open questions

- Routing / prerender approach (next step: lay out options with a recommendation).
- Analytics for `ref` attribution (privacy-friendly counter; none exists today).

## Follow-up projects (separate designs)

- **Progression library:** save / load / rename / delete, auto-naming from roman
  numerals ("ii–V–I in C") or chord symbols, link-provided `name`, source label (link /
  creator). Design together with exercise mode.
- **Exercise mode:** registered exercises (including creators', with permission and
  credit), one click away.
- **FAQ / learn pages:** how-to-in-Fretlab and theory Q&A, plain HTML, one question per
  page, linking into share links.
- **Creator outreach:** personalised links to their specific lessons; start with smaller
  teachers in parallel. Best fits: Brandon D'Eon, Eric Haugen, Daniel Seriff; Bernth
  once exercise mode exists; Marty Music weakest fit (beginner audience).

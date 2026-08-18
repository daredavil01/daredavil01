# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this repo is

This is `daredavil01/daredavil01` — Sanket Tambare's GitHub profile repo, which
doubles as a small static website. There is no build step: every page is
self-contained HTML that must work when served by any static file server.

```
index.html                        Homepage — "Field Almanac": a single-page,
                                   client-side-routed hub (Home/The Day, About,
                                   Miles, Shelf, Treks, Notes, Now, Stats) that
                                   links to ALL content, incl. a full site-map
                                   ("Chapters of the almanac")
about.html                        Interactive 12-slide "About Me" deck
CLAUDE.md                         This file
README.md                         GitHub profile README
docs/
  personal-website-redesign.html  "The Wanderer's Atlas" design dossier (deck)
digital-wellbeing/                "The Wanderer's Digital Escape" browser game
  index.html                      Game entry point
  three-orb-prototype.html        Three.js self-orb prototype
yung-data/                        Adivasi Survey Dashboard (Marathi/English)
  index.html                      Dashboard entry point
```

## ⚠️ Homepage rule (always follow)

**Whenever content is added, renamed, moved, or removed in this repo — a new
page, deck, game, dashboard, prototype, or project directory — update
`index.html` in the same change so the homepage reflects all content.**

Specifically:

1. Add (or update/remove) a card in the **"Things I built you can play with"**
   grid on the Home view of `index.html` (`<section id="view-home">`), with a
   small mono kicker (format · tech), a title, and a one-sentence description,
   matching the existing `.idx-card` markup.
2. Link directly to the entry file with a relative path (e.g.
   `new-project/index.html`, not `new-project/`), so links work on any host.
3. Mirror the change in `README.md` — the **Projects** table and the
   **In This Repo** section — and in the directory tree above.

A page that isn't linked from the homepage is considered unfinished.

## Conventions

- Every sub-page carries a small "← Home" link back to the hub
  (`index.html` from root pages, `../index.html` one level down), styled to
  match that page's own theme. Add one to any new page.
- Keep new root-level files to a minimum; put projects in their own
  directory and design docs/decks in `docs/`.
- `index.html` uses the "Field Almanac" palette: warm paper background
  (`#e6dcc4`/`#f4ecda`), ink text (`#2b2620`), rust accent (`#c4642f`),
  serif display type (Instrument Serif / Newsreader) with IBM Plex Mono
  kickers and Caveat handwritten accents. It is a single HTML document with
  one `<section class="view">` per page, toggled by a small vanilla-JS
  `go(view)` router (`data-nav="<view>"` on any clickable element) — there
  is no separate URL per view. Match this palette and structure for any new
  hub-level UI; don't reintroduce the old dark GitHub-style theme.
- Pages must remain dependency-free at runtime (CDN scripts are fine);
  never introduce a required build step.
- Don't move or rename existing entry points (`about.html`,
  `digital-wellbeing/index.html`, `yung-data/index.html`) without updating
  every internal link and noting the break in the commit message — external
  links may point at them.
- The Home view's "Chapters of the almanac" section and the Stats view's
  in-page sub-nav (About/Miles/Shelf/Treks/Notes/Now/Stats) route via
  `data-nav`; everything else not hosted in this repo (Projects, Résumé,
  Challenges, Changelog, Contact, and each view's "open the full page"
  link) points out to the live site at `daredavil.pages.dev` — keep new
  off-repo content wired the same way rather than building it here.

# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this repo is

This is `daredavil01/daredavil01` — Sanket Tambare's GitHub profile repo, which
doubles as a small static website. There is no build step: every page is
self-contained HTML that must work when served by any static file server.

```
index.html                        Homepage — the hub that links to ALL content
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

1. Add (or update/remove) a card in the **"On this site"** section of
   `index.html` with an emoji icon, a title, a one-sentence description, and
   tech tags matching the existing card markup.
2. Link directly to the entry file with a relative path (e.g.
   `new-project/index.html`, not `new-project/`), so links work on any host.
3. Mirror the change in `README.md` — the **Projects** table and the
   **In This Repo** section — and in the directory tree above.

A page that isn't linked from the homepage is considered unfinished.

## Conventions

- Keep new root-level files to a minimum; put projects in their own
  directory and design docs/decks in `docs/`.
- Match the homepage's dark GitHub-style palette (`#0d1117` background,
  `#161b22` cards, `#58a6ff` links) for any new hub-level UI.
- Pages must remain dependency-free at runtime (CDN scripts are fine);
  never introduce a required build step.
- Don't move or rename existing entry points (`about.html`,
  `digital-wellbeing/index.html`, `yung-data/index.html`) without updating
  every internal link and noting the break in the commit message — external
  links may point at them.

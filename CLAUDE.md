# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.
`AGENTS.md` carries the same rules for other agents — keep the two in sync.

## What this repo is

This is `daredavil01/daredavil01` — Sanket Tambare's GitHub profile repo, which
doubles as a small static website (served by GitHub Pages at
`https://daredavil01.github.io/daredavil01/`). There is no build step: every
page works as static files from any static file server.

```
index.html                        Homepage — "Day Island": one full day drawn as
                                   an ink-on-paper three.js island. Scroll = the
                                   clock + the camera; each stop (Run, Build, Read,
                                   Climb, Commons, Play, Write, Night) is a place on
                                   the island and a chapter of content. Links to ALL
                                   content via the card registry in #map. Falls back
                                   to a classic day-timeline layout (no WebGL,
                                   reduced motion, ?classic, no JS).
about.html                        Interactive 12-slide "About Me" deck
CLAUDE.md                         This file (AGENTS.md mirrors it)
README.md                         GitHub profile README
assets/
  island/                         Everything the homepage needs at runtime
    island.css                    Tokens (day paper / cyanotype night), classic
                                   layout, island-mode panels, ⌘K, pins
    core.js registry.js router.js ui.js cmdk.js notes.js boot-world.js
                                  Classic scripts: IST clock + "now" line, card
                                   registry, deep-link router, ⌘K, field notes, and
                                   the island/classic decision (no CDN needed)
    world/                        ES modules for island mode (three.js via importmap)
      layout.js                   THE world map: terrain shape, stops, camera shots,
                                   prop placements, hotspots, field-note anchors
      terrain.js                  Seeded heightmap → contour rings → extruded terraces
      materials.js post.js        Ink materials + the drawing pass (edges, hatching,
                                   paper, rust, glow)
      palette.js                  Hour → paper/ink/rust/sun/moon (and UI colours)
      props.js scene.js rail.js   Props, the IslandView renderer, the camera rail
      main3d.js capture.js        Island mode controller; ?capture stills
    models/                       props.glb.gz + runner.glb.gz (Kenney CC0, built by
                                   tools/props) and manifest.json
    illustrations/                Ink-on-alpha stills of each stop (classic view)
    renders/                      README banners (day/night) and the OG card
  chrome/chrome.js                Shared "← Home" return chip for every sub-page
tools/                            Authoring + QA only — the site never needs it
  props/                          kits.json + build-props.mjs (Kenney kits → GLB)
  capture.mjs                     Renders illustrations/ and renders/
  qa.mjs                          Playwright QA: links, console, registry, screenshots
  lib/                            Shared Playwright + static-server helpers
docs/
  personal-website-redesign.html  "The Wanderer's Atlas" design dossier (deck)
  yung-foundation-site-overview.html  Yung Foundation site: routes + architecture
  antyodaya-website-overview.html Antyodaya site: features + technical spec
  runfolio-overview.html          RunFolio: the race-portfolio intro deck
  second-brain-overview.html      Ask the Archive: how the site's chatbot is
                                   built, what it costs, and what broke
  what-the-archive-knows.html     Ask the Archive audit: data coverage, blog-text
                                   cost, incremental ingestion, feedback evals
  ask-the-archive-story.html      Ask the Archive from the ground up: data,
                                   database, sources, feedback, admin, timeline
presentations/
  ask-the-archive.html            Ask the Archive: the 29-slide deck version of
                                   docs/ask-the-archive-story.html
  day-island-redesign.html        Day Island, the Redesign: the 25-slide
                                   illustrated deck on how this homepage was
                                   rebuilt — every prompt and design question,
                                   the paths not taken, the ink renderer, the bugs
  assets/day-island/              Screenshots used by that deck (webp)
  digital-hub.html                The Digital Hub: the 30-slide illustrated tour
                                   of sankettambare.in — map, journey, passport,
                                   architecture, Ask the Archive (fixed 1920×1080
                                   canvas, ported from a Claude Design handoff)
  e20-ka-chakravyuha.html         E20 ka Chakravyuha: the 12-slide deck on the
                                   ethanol/sugar trade-off and how the site was built
  projects-page-revamp.html       Projects, Reborn: the 12-slide deck on
                                   rebuilding /projects — data model, four
                                   views, and the bugs the work surfaced
  the-long-way-around.html        The Long Way Round: the 12-slide deck on the
                                   scrollytelling piece — the MET model, the
                                   320M-pixel scroll, the tiers, and what
                                   deriving the numbers caught
developer-infographic/
  index.html                      "A Developer, Measured" — scroll-through
                                   infographic (career gantt, rated stack,
                                   writing ledger, counterweight charts)
digital-wellbeing/                "The Wanderer's Digital Escape" browser game
  index.html                      Game entry point
  three-orb-prototype.html        Three.js self-orb prototype
yung-data/                        Adivasi Survey Dashboard (Marathi/English)
  index.html                      Dashboard entry point
```

## ⚠️ Homepage rule (always follow)

**Whenever a presentation, doc, dashboard, game, prototype or project is added,
renamed, moved or removed, update all three places in the same commit:**

| # | Where | What |
|---|---|---|
| 1 | `index.html` | One registry card in `#map`, in the right band (details below) |
| 2 | `README.md` | The matching **Projects** sub-table row (*Apps, games & data* or *Websites I've designed & built*) **and** a row in **In This Repo** |
| 3 | `CLAUDE.md` **and** `AGENTS.md` | The directory tree at the top of both files (keep the two in sync) |

The task isn't done until all three are updated. A page that isn't linked from
the homepage is unfinished, and `node tools/qa.mjs` fails if any repo page is
missing from `index.html`.

The homepage card, specifically:

1. Add (or update/remove) one card in the registry — the `#map` section of
   `index.html` — in the right band:
   - **"Things I built you can play with"** (`data-band="play"`) — apps, games,
     dashboards and decks you can open and use.
   - **"Websites I've designed & built"** (`data-band="sites"`) — whole sites
     and the dossiers, specs, decks and architecture write-ups behind them.

   ```html
   <article class="card" id="<stop>/<slug>" data-stop="<stop>" data-band="play">
     <a class="card__link" href="new-project/index.html">
       <p class="card__kicker">FORMAT · TECH</p>
       <h4 class="card__title">Title</h4>
       <p class="card__desc">One sentence.</p>
     </a>
   </article>
   ```

   `data-stop` is the place on the island it belongs to: `island run build
   read climb commons play write night`. `registry.js` moves the card to that
   stop, lists it in its band, indexes it for ⌘K and makes the island's
   hotspot fly to it — no JS or 3D edits needed. The `id` (`stop/slug`) is a
   public deep link (`index.html#read/ask-the-archive`): never rename one.
2. Link directly to the entry file with a relative path (e.g.
   `new-project/index.html`, not `new-project/`), so links work on any host.
   Off-repo work links to its live URL or GitHub repo instead, with a
   trailing `↗` in the kicker to mark it as leaving the site.
3. Give the new page the shared return chip (see Conventions), pointing at the
   card's `id`.

## Conventions

- **Every sub-page carries a "← Home" link** back to its own spot on the
  island, plus the shared chrome script:
  ```html
  <a data-island-return href="../index.html#<stop>/<slug>">← Home</a>
  <script src="../assets/chrome/chrome.js" defer data-stop="<stop>"></script>
  ```
  (`index.html…` and `assets/…` without `../` from root pages.) The static
  link works without JS; `chrome.js` draws one consistent chip in its place
  (contour glyph, "← Home", the hour and place it returns to) and matches the
  page's light or dark background. The page's own theme is otherwise untouched.
- Keep new root-level files to a minimum; put projects in their own
  directory, design docs in `docs/` and decks in `presentations/`. A deck's
  screenshots go in `presentations/assets/<deck>/` as webp (roughly 120 KB
  each at most); the island's own renders and stills are referenced in place,
  not copied.
- **The homepage look — "topographic ink".** Day: warm paper `#f4ecda` /
  `#e6dcc4`, ink `#2b2620`, rust accent `#c4642f`. Night (and dark mode):
  cyanotype paper `#0f2a47` / `#13365b`, pale ink `#dfe9f1`, rust `#e0864f`.
  Type: Instrument Serif (display), Newsreader (body), IBM Plex Mono
  (kickers), Caveat (handwritten notes). Tokens live on `:root` in
  `assets/island/island.css`; in island mode `main3d.js` rewrites them from
  the scene hour. Don't reintroduce the old Field Almanac view router or the
  dark GitHub-style theme.
- **Navigation is plain element ids.** Every stop is a `<section class="stop"
  id="…">`, every card an `<article id="stop/slug">`; links, ⌘K, hotspots, the
  arrow keys and Back all go through `DayIsland.go()`.
- **The world lives in `assets/island/world/layout.js`.** Move the camera,
  add a prop or a field note there, not in the renderer. Props come from
  Kenney kits: add the model to `tools/props/kits.json`, run
  `npm ci --prefix tools && node tools/props/build-props.mjs`, then place it in
  `layout.js`. Never hand-edit the `.glb.gz` files.
- After changing the world, re-render the stills and banners:
  `node tools/capture.mjs` (writes `assets/island/illustrations/` and
  `assets/island/renders/`).
- Pages must remain dependency-free at runtime (CDN scripts are fine;
  three.js is pinned in `index.html`'s importmap to
  `three@0.186.0` on cdn.jsdelivr.net); never introduce a required build step.
  The site must never need `tools/` to be served.
- Budgets: `props.glb.gz` ≤ 600 KB (the build fails over it); keep the island
  below ~1 MB of 3D payload and the classic view light.
- Don't move or rename existing entry points (`about.html`,
  `digital-wellbeing/index.html`, `yung-data/index.html`) without updating
  every internal link and noting the break in the commit message — external
  links may point at them.
- Off-repo content (Projects, Résumé, Challenges, Changelog, Contact, and each
  stop's "full page" link) points out to the live site at `sankettambare.in`.
  Keep new off-repo links wired the same way rather than building them here;
  the general ones go in the Night stop's "Across the water ↗" list.

## Checking your work

- Serve the repo root (ES modules need http): `python3 -m http.server 3010` or
  `npx serve . -l 3010`, then open `index.html` (island), `index.html?classic`
  and `index.html?island&t=22:30` (any hour in Pune; `&day=Sat` for weekends).
  `?debug` shows a frame-time HUD.
- Run `npm ci --prefix tools && node tools/qa.mjs` — it checks every link and
  that every repo page is linked from the homepage, console errors on all pages,
  the registry and the 3D contract, the return chips, and writes screenshots
  to `tools/.qa/`. It uses the Chromium already in `/opt/pw-browsers`; never run
  `playwright install`.

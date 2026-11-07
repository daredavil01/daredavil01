# my-site

Personal site. <Framework> → Cloudflare Workers (static assets).

- Content lives in `content/`; only `src/lib/content` reads it.
  Never hard-code copy, links or numbers in components.
- Plan: `docs/phased-plan.md`. Work on one phase per session; tick it when done.
- Decisions: `docs/technical-decisions.md`. Don't change one without asking.
- Before any commit: `npm run build` must pass.
- Every change adds a line to `CHANGELOG.md`.
- Every page has a unique title, description and a 1200×630 share image.

## Lessons
<!-- one line per gotcha, the day you find it -->

# technical-decisions.md

One entry per decision. Keep each to the template below.
Revisit an entry when its "revisit when" comes true — not before.

---

## D1 · Framework
- **Options:** Astro · Next.js · SvelteKit · React + Vite
- **Pros / cons:** (from the research, with links)
- **Choice:**
- **Why:**
- **Revisit when:**

## D2 · Hosting
- **Options:** Cloudflare Workers (static assets) · Cloudflare Pages · Vercel · Netlify · GitHub Pages
- **Choice:**
- **Why:**
- **Revisit when:**

## D3 · Where content lives
- **Rule:** content lives in `content/` (Markdown with frontmatter for prose,
  JSON/YAML for lists, original images in `content/images/`). Only
  `src/lib/content` reads it. Components never contain copy.
- **Revisit when:** someone else needs to edit content without Git → a CMS or
  database, by rewriting `src/lib/content` only.

## D4 · Styling
## D5 · Images (sizes, formats, where they're stored)
## D6 · SEO (titles, descriptions, share cards, sitemap)
## D7 · Analytics (or none)
## D8 · Domain and DNS

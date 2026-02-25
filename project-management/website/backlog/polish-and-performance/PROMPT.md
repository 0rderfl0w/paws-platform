Project: CAPA PVL (capapvl.pt) — Dog Shelter Website

Working directory: `~/projects/capapvl.pt/`

Before You Start

1. Read `PROJECT.md` — full stack, architecture, design direction
2. Read first 30 lines of `CHANGELOG.md`
3. Read this task's `SPEC.md` (same directory as this file)
4. Run `git log --oneline -5`

Your Task: Polish & Performance

Final quality pass before the site goes live.

1. Hero section — check with Z if it needs further tweaking (it's been through multiple iterations)
2. Run a performance audit: check image sizes in `public/images/`, compress any over 200KB, verify lazy loading on images below the fold
3. Check bundle size — are we shipping anything unnecessary?
4. Add Twitter card meta tags (currently only OG tags exist in `src/layouts/Layout.astro`)
5. Review all pages on mobile viewport (320px, 375px, 768px) — flag anything broken
6. Ask Z: contact form or just mailto links?

Key Details

- Design: warm earth tones (orange/brown/green) defined in `src/styles/global.css` via `@theme`
- OG tags already on all public pages, admin has noindex
- Images were resized during scrape but some may still be large
- Hero: 2-column split layout (orange text left, dog photo right, curved boundary)

Constraints

- Bun runtime
- Don't change core functionality — this is polish only
- Build must pass clean: `bun run build`
- Update CHANGELOG.md when done

# AGENTS.md — capapvl.pt (CAPA Póvoa de Lanhoso)

## Hetzner Primary Workflow

- Active project work happens on Hetzner under `/home/deploy/projects/...`.
- GitHub is durable version history after meaningful changes are committed and pushed.
- Air `/Users/z/Projects/...` is a backup/mirror, not the active working root unless Z explicitly asks for Air-local work.
- If Z explicitly asks for Air-local work, pull the Air repo from GitHub before editing, commit/push from Air afterward, then pull/update the Hetzner repo before hosted agents continue on that repo.
- If an old prompt names `/Users/z/Projects/<repo>`, translate it to `/home/deploy/projects/<repo>` for active work after verifying the Hetzner root exists.

## Skills

Before starting frontend work, invoke the **`frontend`** skill (Astro 5 + React 19 + Tailwind 4).

Dog shelter website for **CAPA Póvoa de Lanhoso** (Clube de Adoção e Proteção Animal), a Portuguese non-profit rescue/shelter/adoption organization. Built on the paws-platform open-source template.

**Live:** https://capapvl.org/ (Hetzner nginx static site + API proxy)
**Repo:** https://github.com/0rderfl0w/paws-platform

---

## Setup

```bash
bun install
cp .env.example .env   # set PUBLIC_CAPA_API_URL for local frontend work
bun dev                # http://localhost:4321
bun build              # builds to ./dist/
bun preview            # preview production build locally
```

---

## Stack & Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 + React 19 islands |
| Styling | Tailwind CSS 4 (CSS-first @theme in src/styles/global.css) |
| Runtime | Bun |
| Backend | Hetzner Bun API + PostgreSQL (`capapvl_db`) plus committed public static fallback |
| Hosting | Hetzner nginx static site at `/home/deploy/apps/capapvl`; API proxied to loopback Bun service |

**Architecture pattern:**
- Astro static pages for public content (Home, About, Help/Donate, Adoption)
- React islands (client:visible) for dynamic content (dog listings, profiles, admin)
- Public dog listings and profiles load from the Hetzner API when available, but must keep the committed local fallback because external/backend outages have happened before.
- Static hosting constraint: no SSR, no dynamic routes → dog profile uses query param /cao?id=uuid

---

## Hetzner API

**API:** `https://api.capapvl.org` (Namecheap DNS points `capapvl.org`, `www`, and `api` to Hetzner `65.21.156.73`)
**Service:** `capapvl-api.service`
**Runtime:** Bun, `server/capa-api.ts`
**Database:** `capapvl_db` on local PostgreSQL
**Bind/security:** `server/capa-api.ts` must bind `127.0.0.1:3314`; public HTTPS access goes through nginx only. Do not widen the API to `0.0.0.0` or expose raw `3314` to fix connectivity.

**2026-05-15 status:** The legacy Supabase project `amkwoeepuhlnjmybbnbo.supabase.co` returns NXDOMAIN from Hetzner and local DNS. Runtime Supabase usage has been migrated to the Hetzner API. Public pages still keep `src/data/capaDogs.ts` and static files under `public/images/dogs/` as a fallback.

**Admin:** `/admin` and `/en/admin` authenticate against the Hetzner API and write to `capapvl_db`. Photo uploads write to `public/images/dogs/{slug}/` on Hetzner and are served through the API image route.

### dogs table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Not null |
| size | text | 'small' / 'medium' / 'large' |
| sex | text | 'male' / 'female' / null |
| age | text | Free text |
| description | text | Multi-line, parsed client-side |
| photo_url | text | Public URL to first API-served photo |
| is_adopted | boolean | Default false |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### Hetzner photo files
- Public read through the API image route; authenticated admin writes through the API upload/delete routes.
- Files live at `public/images/dogs/{slug}/photo-*.jpg` on Hetzner.
- Structure: `{slug}/photo-01.jpg`, `photo-03.jpg`, etc. (`photo-02` was the logo, all deleted)
- Slugs: lowercase, accents stripped (NFD normalization), spaces → hyphens

**Current data:** 104 dogs in `src/data/capaDogs.ts`; 977 restored dog photos committed under `public/images/dogs/{slug}/photo-*.jpg`, recovered from `/Users/z/capapvl-photos-backup` on 2026-05-15.

---

## Env Vars

```
PUBLIC_CAPA_API_URL=https://api.capapvl.org

# server-only (/etc/capapvl-api.env on Hetzner)
DATABASE_URL=postgres://capapvl_app:<password>@127.0.0.1:5432/capapvl_db
CAPA_ADMIN_EMAIL=<admin email>
CAPA_ADMIN_PASSWORD_SHA256=<sha256 password hash>
CAPA_SESSION_SECRET=<random secret>
CAPA_PUBLIC_API_URL=https://api.capapvl.org
CAPA_ALLOWED_ORIGINS=https://capapvl.org,https://www.capapvl.org,https://capapvl.pt,https://www.capapvl.pt,http://127.0.0.1:14324,http://127.0.0.1:4321
CAPA_PROJECT_ROOT=/home/deploy/projects/capapvl.pt
PORT=3314
```

.env is gitignored. Do not commit `/etc/capapvl-api.env` or any server-only secrets.

Hetzner security posture: local `.env` files are intentionally owner-only (`chmod 600`, `deploy:deploy`). Do not loosen permissions to "fix" access; agents running as `deploy` can still read them. The live API's server-only secrets belong in `/etc/capapvl-api.env`, not in repo files.

---

## Pages

| Page | Route | Type | Notes |
|------|-------|------|-------|
| Home | / | Static + React island | Hero, stats, featured dogs, about blurb, help CTA |
| Dogs | /caes | React island | Full listings with size + sex filters + name search |
| Dog Profile | /cao?id={uuid} | React island | Photo gallery, parsed description, adoption CTA |
| About | /sobre-nos | Static | Mission, principles, community |
| Help | /ajudar | Static | Donations, FAT foster program |
| Adoption | /adocao | Static | Process, pricing (F 75€, M 65€, puppy 30€) |
| Admin | /admin | Hetzner API | Protected login; CRUD and photo uploads persist to `capapvl_db` + Hetzner image files |

---

## Key Paths

```
src/
├── components/
│   ├── FeaturedDogs.tsx    # Homepage React island (client:visible)
│   ├── DogListings.tsx     # /caes — filters + search (React)
│   ├── DogProfile.tsx      # /cao?id= — gallery + CTA (React)
│   ├── AdminPanel.tsx      # /admin — Hetzner API admin (React)
│   ├── Hero.astro          # Homepage hero
│   ├── Nav.astro           # Navigation
│   ├── Stats.astro         # Shelter statistics counters
│   └── ...
├── lib/
│   └── capaApi.ts          # Hetzner API client + Dog type
├── data/
│   └── capaDogs.ts         # 104-dog static fallback with local photo/gallery paths
├── pages/                  # Each file = a route
└── styles/
    └── global.css          # Tailwind @theme (color tokens)
public/images/dogs/         # Restored dog photo galleries, committed static fallback
server/capa-api.ts          # Bun API served by capapvl-api.service
scripts/                    # Hetzner migration/data maintenance scripts
```

---

## Design Conventions (Z-Approved)

- **Palette:** Warm earth tones — primary (orange), warm (brown/cream), nature (green)
  - Defined via @theme in src/styles/global.css
  - primary-* (orange spectrum), warm-* (brown/cream), nature-* (green)
- **Vibe:** Warm, emotional, charity energy — NOT tech startup
- **Backgrounds:** Alternating white / warm-50 / warm-100 sections
- **Cards:** rounded-2xl, soft shadows, warm borders, fully clickable
- **Typography:** Inter, bold headings in warm-900
- **Buttons:** primary-500 orange, rounded-xl, hover transitions
- **Mobile-first:** Always responsive, hamburger nav on mobile
- **Language:** Portuguese (PT) — all public content

---

## Deploy

Live production is Hetzner nginx serving the Astro static build from `/home/deploy/apps/capapvl`, plus `api.capapvl.org` proxying the loopback Bun API. The old Hostinger `deploy` branch workflow is legacy/transitional only, not the current live surface.

**Git identity:** zkgit.substance129@passmail.com

```bash
# Build with the production API URL, then publish static files to nginx root.
PUBLIC_CAPA_API_URL=https://api.capapvl.org bun run build
rsync -a --delete dist/ /home/deploy/apps/capapvl/
find /home/deploy/apps/capapvl -type d -exec chmod 755 {} +
find /home/deploy/apps/capapvl -type f -exec chmod 644 {} +
```

WARNING: Do not edit files directly under `/home/deploy/apps/capapvl`; they are generated from source and overwritten by the next build/sync.

**Live verification:** A successful build/sync is not enough. Confirm the live site and API return the expected production responses, for example:

```bash
curl -sS -I https://capapvl.org/
curl -sS https://api.capapvl.org/health
curl -sS 'https://api.capapvl.org/dogs?includeAdopted=true' | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["dogs"]))'
```

For browser-level verification, use Playwright against `https://capapvl.org/caes/` and confirm `https://api.capapvl.org/dogs` returns 200 with 104 dog cards rendered.

---

## Gotchas

- **Canonical domain:** `https://capapvl.org` is canonical; `www.capapvl.org` should redirect to the apex so browser API calls use the allowed `https://capapvl.org` origin.
- **Hetzner API path:** `https://api.capapvl.org` is the public API origin. The older `https://richkapp.com/capapvl-api` bridge is legacy and should not be used for new builds.
- **Raw API bind:** `capapvl-api.service` must stay loopback-only on `127.0.0.1:3314`. The public surface is the nginx HTTPS bridge, not raw port `3314`.
- **Legacy Supabase unavailable:** The old project ref returned NXDOMAIN on 2026-05-15. Do not add new runtime Supabase dependencies.
- **Static site:** No SSR, no dynamic routes. Dog profiles use /cao?id=uuid.
- **Legacy Supabase key note:** sb_publishable_/sb_secret_ previously worked with @supabase/supabase-js v2.97.0, but runtime Supabase usage has since been removed.
- **Logo was photo-02:** Every dog's original page had the CAPA logo as photo-02. All deleted from storage. If re-scraping, filter files < 20KB.
- **Accented slugs:** NFD normalization used in upload scripts (Jóia → joia). Don't break this.
- **No unique constraint on name:** Re-running upload scripts creates duplicates. Use upsert or check first.
- **React islands are client:visible:** They lazy-load on scroll. Good for performance.

---

## Remaining Work

- [x] Point `capapvl.org`, `www.capapvl.org`, and `api.capapvl.org` to Hetzner `65.21.156.73`, issue cert, and update `PUBLIC_CAPA_API_URL`/`CAPA_PUBLIC_API_URL` from the temporary RichKapp bridge.
- [ ] Z to revoke/remove any remaining legacy Supabase project credentials in Supabase dashboard if accessible.

---

## Decision Log

- 2025-07-26: Z approved warm earth tone palette. Carry this style to all pages. (Crash & Burn)
- 2026-02-24: Astro + React + Supabase + Hostinger stack chosen. Matches existing project patterns. (Crash & Burn)
- 2026-02-24: Dog profile uses /cao?id=uuid (query param) — Hostinger static-only, no dynamic routes. (Crash & Burn)
- 2026-02-24: Legacy JWT keys for Supabase — new format not compatible. (Crash & Burn)
- 2026-02-24: Photos resized to 1200px/80% JPEG via sharp before upload — stays within 500MB free tier. (Crash & Burn)
- 2026-03-16: sb_publishable_/sb_secret_ format confirmed working with @supabase/supabase-js v2.97.0 — legacy keys rotated after .env exposure. (Razor & Blade)
- 2026-03-16: Logo/footer/header changes ported from deploy branch HTML back to Astro source files. Never edit deploy branch directly again. (Razor & Blade)
- 2026-03-16: SUPABASE_SERVICE_ROLE_KEY was committed to git — rotated all keys, .env recreated. (Razor & Blade)
- 2026-05-15: Supabase project ref returned NXDOMAIN; public dog pages now use committed static fallback data and restored local dog photos. Hostinger Git deploy push succeeded but live origin did not update during verification, so hPanel may need manual deployment trigger. (Codex)
- 2026-06-10: Canonical live surface moved to Hetzner at `https://capapvl.org`; Namecheap DNS points apex/www/api to `65.21.156.73`; Let's Encrypt covers apex/www/api; `www` redirects to apex; API origin is `https://api.capapvl.org`. (Hermes)

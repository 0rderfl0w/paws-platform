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

**Live:** https://capapvl.pt/ (Hostinger static; deploy branch is the intended source, but hPanel may need manual trigger if Git deploy stalls)
**Repo:** https://github.com/0rderfl0w/paws-platform

---

## Setup

```bash
bun install
cp .env.example .env   # fill in Supabase keys (see Env Vars below)
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
| Backend | Supabase legacy data plus committed static fallback |
| Hosting | Hostinger (static only) |

**Architecture pattern:**
- Astro static pages for public content (Home, About, Help/Donate, Adoption)
- React islands (client:visible) for dynamic content (dog listings, profiles, admin)
- Public dog listings and profiles load from Supabase when available, but must keep the committed local fallback because the legacy Supabase project has gone unavailable before.
- Static hosting constraint: no SSR, no dynamic routes → dog profile uses query param /cao?id=uuid

---

## Supabase

**Project ref:** amkwoeepuhlnjmybbnbo

**2026-05-15 status:** `amkwoeepuhlnjmybbnbo.supabase.co` returns NXDOMAIN from Hetzner and local DNS. Public pages therefore rely on `src/data/capaDogs.ts` and static files under `public/images/dogs/` until Supabase is recovered or replaced. Do not remove the local dataset/photo fallback unless a live replacement is verified.

### dogs table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Not null |
| size | text | 'small' / 'medium' / 'large' |
| sex | text | 'male' / 'female' / null |
| age | text | Free text |
| description | text | Multi-line, parsed client-side |
| photo_url | text | Public URL to first photo in storage |
| is_adopted | boolean | Default false |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### Storage: dog-photos bucket
- Public read, authenticated write (RLS)
- Structure: {slug}/photo-01.jpg, photo-03.jpg, etc. (photo-02 was the logo, all deleted)
- Slugs: lowercase, accents stripped (NFD normalization), spaces → hyphens

**Current data:** 104 dogs in `src/data/capaDogs.ts`; 977 restored dog photos committed under `public/images/dogs/{slug}/photo-*.jpg`, recovered from `/Users/z/capapvl-photos-backup` on 2026-05-15.

---

## Env Vars

```
PUBLIC_SUPABASE_URL=https://amkwoeepuhlnjmybbnbo.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<legacy JWT anon key>
SUPABASE_SERVICE_ROLE_KEY=<legacy JWT service_role key>
```

.env is gitignored. Now uses new `sb_publishable_`/`sb_secret_` key format — confirmed compatible with @supabase/supabase-js v2.97.0 (legacy JWT keys have been rotated out).

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
| Admin | /admin | Planned | Protected — CRUD dogs + photo management |

---

## Key Paths

```
src/
├── components/
│   ├── FeaturedDogs.tsx    # Homepage React island (client:visible)
│   ├── DogListings.tsx     # /caes — filters + search (React)
│   ├── DogProfile.tsx      # /cao?id= — gallery + CTA (React)
│   ├── AdminPanel.tsx      # /admin — planned (React)
│   ├── Hero.astro          # Homepage hero
│   ├── Nav.astro           # Navigation
│   ├── Stats.astro         # Shelter statistics counters
│   └── ...
├── lib/
│   └── supabase.ts         # Supabase client
├── data/
│   └── capaDogs.ts         # 104-dog static fallback with local photo/gallery paths
├── pages/                  # Each file = a route
└── styles/
    └── global.css          # Tailwind @theme (color tokens)
public/images/dogs/         # Restored dog photo galleries, committed static fallback
supabase/                   # DB setup files
scripts/                    # Upload + data migration scripts
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

Uses orphan deploy branch. Hostinger is configured to deploy from Git, but this can stall; verify live origin after every push.

**Git identity:** zkgit.substance129@passmail.com

```bash
# Build first
bun build

# Push dist/ to deploy branch via worktree (NEVER checkout the branch directly)
git worktree add /tmp/capapvl-deploy deploy
rsync -a --delete --exclude=.git --exclude=.gitignore dist/ /tmp/capapvl-deploy/
cd /tmp/capapvl-deploy && git add -A && git commit -m "deploy" && git push
git worktree remove /tmp/capapvl-deploy
```

WARNING: NEVER git checkout deploy in the project dir — use worktrees only.

**CRITICAL: Never make changes directly on the deploy branch.**
All changes must go through source files on main → build → copy to deploy. Direct edits to deploy HTML will be overwritten on the next build. Incident: Mar 16 — logo/footer redesign done directly on deploy branch was wiped when next build pushed from main.

**Before overwriting deploy branch:** Always dry-run the sync against the deploy worktree, e.g. `rsync -ani --delete --exclude=.git --exclude=.gitignore dist/ /tmp/capapvl-deploy/`, and inspect deletes/new assets. Don't blindly copy `dist/` without checking for deploy-only changes that haven't been ported to source.

**Live verification:** A successful push to `deploy` is not enough. Confirm the live HTML references the new hashed asset(s) and that changed files return `200`, for example:

```bash
curl -sSL https://capapvl.pt/caes/ | rg '_astro/(capaDogs|DogListings).*\.js'
curl -sS -o /dev/null -w '%{http_code}\n' https://capapvl.pt/images/dogs/andy/photo-01.jpg
```

On 2026-05-15, `main` (`fad3f16`) and `deploy` (`2d83c7c`) were pushed successfully, but Hostinger still served the old build during verification. If that repeats, manually trigger/reconnect Git deployment in Hostinger hPanel before claiming production is updated.

---

## Gotchas

- **Supabase free tier:** 500MB storage — photos are pre-resized before upload. Monitor usage.
- **Supabase project unavailable:** The legacy project ref returned NXDOMAIN on 2026-05-15. Keep `src/data/capaDogs.ts` and `public/images/dogs/` as the production fallback until a replacement backend is verified.
- **Hostinger static only:** No SSR, no dynamic routes. Dog profiles use /cao?id=uuid.
- **Hostinger deploy trigger can stall:** Verify live origin, not just GitHub branch state.
- **New key format works fine:** sb_publishable_/sb_secret_ confirmed working with @supabase/supabase-js v2.97.0. Legacy JWT keys were rotated after an accidental .env commit.
- **Logo was photo-02:** Every dog's original page had the CAPA logo as photo-02. All deleted from storage. If re-scraping, filter files < 20KB.
- **Accented slugs:** NFD normalization used in upload scripts (Jóia → joia). Don't break this.
- **No unique constraint on name:** Re-running upload scripts creates duplicates. Use upsert or check first.
- **React islands are client:visible:** They lazy-load on scroll. Good for performance.

---

## Remaining Work

- [ ] Decide whether to restore/replace Supabase or keep static dog data as the production path.
- [ ] Verify Hostinger hPanel Git deployment pulls commit `2d83c7c` or manually trigger it.
- [ ] /admin page — React island exists, but depends on a working backend/storage path before shelter staff can safely use CRUD/photo management.
- [ ] Supabase Auth setup — create admin user for shelter staff if Supabase is restored/replaced.
- [ ] Add unique constraint on dogs.name to prevent duplicates
- [ ] Z to revoke legacy HS256 signing key in Supabase dashboard (safe now — site runs on new publishable key)

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

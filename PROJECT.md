# CAPA PVL — capapvl.pt

Dog shelter website for **CAPA Póvoa de Lanhoso** (Clube de Adoção e Proteção Animal), a Portuguese non-profit rescue/shelter/adoption organization.

**Live (current):** https://capapvl.pt/ (Tilde website builder — being replaced)

---

## Stack

- **Framework:** Astro 5 + React 19 islands
- **Styling:** Tailwind CSS 4 (CSS-first config, `@theme` blocks in `src/styles/global.css`)
- **Runtime:** Bun
- **Backend:** Supabase (Database, Storage, Auth planned for admin)
  - **Project ref:** `amkwoeepuhlnjmybbnbo`
  - **Database:** `dogs` table (id, name, size, sex, age, description, photo_url, is_adopted, created_at, updated_at)
  - **Storage:** `dog-photos` bucket (public) — organized as `{slug}/photo-01.jpg`, `photo-03.jpg`, etc.
  - **RLS:** Public read on dogs + photos. Authenticated write for admin.
  - **Auth:** Not yet configured (planned for admin panel)
- **Hosting:** Hostinger (static)
- **Deploy:** Build on `main`, copy `dist/` to orphan `deploy` branch, push → Hostinger auto-deploys from Git

## Architecture

- Static Astro pages for public content (Home, About, Help/Donate, Adoption)
- React islands for dynamic content:
  - `FeaturedDogs.tsx` — homepage featured dogs (client:visible, lazy load)
  - `DogListings.tsx` — `/caes` full listings with size + sex filters + search
  - `DogProfile.tsx` — `/cao?id=` individual dog page with photo gallery
  - Admin panel (planned — React island behind Supabase auth)
- All dog data lives in Supabase — no rebuild needed when dogs change
- Photos stored in Supabase Storage, resized to 1200px wide / 80% JPEG quality via sharp
- Static hosting constraint: no SSR, no dynamic routes. Dog profile uses query param (`/cao?id=uuid`)

## Pages

| Page | Route | Type | Notes |
|------|-------|------|-------|
| Home | `/` | Static + React island | Hero, stats, why adopt, featured dogs, about blurb, help CTA |
| Dogs | `/caes` | React island | Full listings, size + sex filters, name search |
| Dog Profile | `/cao?id={uuid}` | React island | Photo gallery, parsed description, adoption CTA |
| About | `/sobre-nos` | Static | Mission, principles, community, rehabilitation |
| Help | `/ajudar` | Static | Donations (monetary, goods, time), FAT foster program |
| Adoption | `/adocao` | Static | Benefits, 6-step process, pricing (F 75€, M 65€, puppy 30€) |
| Admin | `/admin` | Planned | Protected — CRUD dogs, manage photos |

## Data

- **104 dogs** in Supabase (99 with descriptions, 99 with sex, 5 unknown)
- **~980 photos** in Supabase Storage (1,081 scraped minus 104 logos removed, resized)
- Descriptions scraped from original site: sex, age, breed, personality, sociability, medical info, stories
- Data files (not in git): `all-dogs.json`, `dogs-descriptions.json`, `dogs/` folder (311MB originals)
- Scripts: `scripts/upload-dogs.ts`, `scripts/upload-missing.ts`, `scripts/update-descriptions.ts`, `scripts/add-sex-column.ts`, `scripts/delete-logos.ts`, `scripts/download-dogs.ts`

## Supabase Schema

### `dogs` table
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

### Storage: `dog-photos` bucket
- Public read, authenticated write
- Structure: `{slug}/photo-01.jpg`, `photo-03.jpg`, etc. (photo-02 was the logo, deleted)
- Slugs: lowercase, accents stripped, spaces → hyphens

## Language

- Portuguese (PT) — all public-facing content
- Admin panel language TBD

## Key Features

- Dog listings filterable by size (Pequenos/Médios/Grandes) AND sex (Macho/Fêmea)
- Name search
- Individual dog profiles with photo carousel, parsed structured description, adoption CTA
- Impact stats counters (sterilized / adopted / in shelter)
- Clickable dog cards (full card is a link)
- Responsive, mobile-first

## Git

- **Repo:** https://github.com/0rderfl0w/paws-platform
- **Git email:** zkgit.substance129@passmail.com
- **Branches:** `main` (source), `deploy` (built output for static hosting)

## Env Vars

```
PUBLIC_SUPABASE_URL=https://amkwoeepuhlnjmybbnbo.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<legacy JWT anon key>
SUPABASE_SERVICE_ROLE_KEY=<legacy JWT service_role key>
```

`.env` is gitignored. Legacy JWT keys required (not the new `sb_publishable_`/`sb_secret_` format).

## Gotchas

- **Supabase free tier:** 500MB storage. Photos resized before upload. Monitor usage.
- **Hostinger is static-only:** No SSR, no dynamic routes. Use query params for dynamic pages.
- **Legacy JWT keys required:** `@supabase/supabase-js` needs the legacy `eyJhb...` keys, not new-format keys
- **Logo in photo-02:** Every dog's original page had the CAPA logo as photo-02. All deleted from storage. If re-scraping, filter files < 20KB.
- **Accented dog names:** Slugs strip accents (Jóia → joia). Upload scripts handle NFD normalization.
- **No unique constraint on `name`:** Re-running upload scripts creates duplicates. Use upsert or check first.

## Design Direction (Z-Approved)

- **Palette:** Warm earth tones — primary (orange), warm (brown), nature (green)
  - Defined in `src/styles/global.css` via `@theme` blocks
  - Primary: `primary-50` through `primary-900` (orange spectrum)
  - Warm: `warm-50` through `warm-900` (brown/cream spectrum)
  - Nature: `nature-50` through `nature-900` (green spectrum)
- **Vibe:** Warm, inviting, emotional — charity energy, not tech startup
- **Backgrounds:** White/cream alternating sections (`warm-50`, `warm-100`, white)
- **Cards:** Rounded corners (`rounded-2xl`), soft shadows, warm borders. Fully clickable.
- **Typography:** Inter font family, bold headings in `warm-900`
- **Buttons:** Primary orange (`primary-500`), rounded (`rounded-xl`), with hover transitions
- **Size badges:** Green for Pequeno, orange for Médio, brown for Grande
- **Sex filter:** Brown (`warm-700`) active state, symbols ♀/♂
- **Mobile-first:** Always responsive, hamburger nav on mobile
- **Accessibility:** Semantic HTML, ARIA labels, good contrast, alt text

## Remaining Work

- [ ] `/admin` page — React island behind Supabase auth, CRUD dogs + photo management
- [ ] Supabase Auth setup — create admin user for shelter staff
- [ ] Deploy setup — orphan `deploy` branch, Hostinger config
- [ ] Add unique constraint on `dogs.name` to prevent duplicates
- [ ] Consider adding `age` structured field (currently in description text)

## Decision Log

- 2025-07-26: Z approved landing page design — warm earth tones, soft palette. Carry this style forward to all pages. (Crash & Burn)
- 2026-02-24: Chose Astro + React + Supabase + Hostinger stack. Matches existing project patterns. Admin panel is a React island behind Supabase auth, not a separate app. (Crash & Burn)
- 2026-02-24: Dog profile uses `/cao?id=uuid` (query param) instead of `/caes/{id}` (dynamic route) because Hostinger is static-only. (Crash & Burn)
- 2026-02-24: Used legacy JWT keys for Supabase — new `sb_publishable_`/`sb_secret_` format not compatible with `@supabase/supabase-js`. (Crash & Burn)
- 2026-02-24: Photos resized to 1200px wide, 80% JPEG quality via sharp before upload to stay within 500MB free tier. (Crash & Burn)

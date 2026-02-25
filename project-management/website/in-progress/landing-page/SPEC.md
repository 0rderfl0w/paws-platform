---
priority: "1st"
category: "engineering"
tags: ["frontend", "astro", "react", "landing-page", "supabase"]
created: "2026-02-24"
---

# CAPA PVL — Full Site Build (capapvl.pt)

## Remaining TODO

### Admin Panel
- [ ] Build `/admin` page — React island behind Supabase auth
- [ ] Supabase Auth setup — create admin user (email/password) for shelter staff
- [ ] CRUD dogs: add, edit, remove dogs from the database
- [ ] Photo management: upload, reorder, delete dog photos
- [ ] Toggle `is_adopted` status per dog
- [ ] Bulk actions (mark adopted, delete)

### Data Cleanup
- [ ] Add unique constraint on `dogs.name` to prevent duplicates
- [ ] Consider adding structured `age` field (currently embedded in description text)
- [ ] Fill in 5 missing descriptions (Bella, Bolt, Channel, Rastas, Bailey)
- [ ] Fill in 5 missing sex values (same 5 dogs)

### Deployment
- [ ] Set up orphan `deploy` branch
- [ ] Configure Hostinger static hosting
- [ ] DNS / domain setup for capapvl.pt
- [ ] Test production build + verify Supabase connectivity from deployed site

### Polish
- [ ] SEO / meta tags (Open Graph, Twitter cards, per-page descriptions)
- [ ] Favicon (CAPA logo)
- [ ] Contact form (or just mailto: links — TBD)
- [ ] 404 page
- [ ] Performance audit (image lazy loading, bundle size)

---

## Completed ✅

### Landing Page (Homepage `/`)
- [x] Astro project scaffolded and builds clean with Bun
- [x] All 8 sections rendered: Nav, Hero, Stats, WhyAdopt, FeaturedDogs, AboutBlurb, HelpCta, Footer
- [x] Featured dogs section fetches from Supabase (React island, `client:visible`)
- [x] Size filter works (small/medium/large tabs)
- [x] Dog cards display photo, name, size, description — fully clickable
- [x] Stats counters animate on scroll (IntersectionObserver)
- [x] Fully responsive (mobile, tablet, desktop)
- [x] Navigation works with mobile hamburger
- [x] All copy in Portuguese
- [x] Supabase schema created (dogs table + storage bucket + RLS)
- [x] Builds successfully on Bun

### Dog Listings Page (`/caes`)
- [x] DogListings React island with full Supabase fetch
- [x] Size filter tabs (Todos/Pequenos/Médios/Grandes)
- [x] Sex filter tabs (Todos/♀ Fêmea/♂ Macho) — works in conjunction with size
- [x] Name search
- [x] Results count
- [x] Responsive grid, loading skeletons, seed data fallback
- [x] Fully clickable cards (whole card links to dog profile)

### Dog Profile Page (`/cao?id={uuid}`)
- [x] Full-width photo gallery with carousel + thumbnails
- [x] Parsed structured description: personality quote, "A Minha História", "Sobre Mim" grid, "Compatibilidade" tags
- [x] Adoption CTA with email link + adoption process link
- [x] Breadcrumb navigation
- [x] 404 state for missing dogs
- [x] Loading skeleton

### About Page (`/sobre-nos`)
- [x] Hero, stats reuse, 3 principles cards, community/schools, rescue & rehab, success stories CTA

### Help/Donate Page (`/ajudar`)
- [x] Donativos em Género (4 cards), Doação de Tempo (4 volunteer cards), FAT foster section
- [x] Donativos Monetários with IBAN + MBWay + PayPal

### Adoption Page (`/adocao`)
- [x] 6 benefits grid, 6-step adoption timeline
- [x] 3 pricing cards (Fêmea 75€ / Macho 65€ / Bebé 30€)
- [x] Success stories section

### Supabase & Data
- [x] Connected Supabase project (amkwoeepuhlnjmybbnbo)
- [x] Applied migration: dogs table, RLS policies, dog-photos storage bucket
- [x] 104 dogs uploaded with descriptions and sex data
- [x] ~980 photos uploaded (resized 1200px/80% JPEG via sharp)
- [x] Deleted 104 CAPA logo images from storage
- [x] `sex` column added and populated (44 male, 55 female, 5 unknown)

### Navigation & Footer
- [x] Nav updated with all page links including Adoção
- [x] Footer with real contact info (email, address, IBAN)

---

## Original Spec (Reference)

### Overview

Build the homepage for CAPA Póvoa de Lanhoso's dog shelter website. This is the primary public-facing page that drives adoption interest, showcases available dogs, and communicates the shelter's mission.

**Reference:** https://capapvl.pt/ (current Tilde-built site being replaced)
**Language:** Portuguese (PT) throughout

---

### Tech Stack

- Astro 5 + React 19 islands
- Tailwind CSS 4 (CSS-first config, @theme blocks)
- Bun (runtime)
- Supabase (database + storage for dog listings)

---

### Page Sections (top to bottom)

#### 1. Navigation Header
- CAPA logo/name
- Nav links: Início, Os Nossos Cães, Sobre Nós, Ajudar
- Mobile hamburger menu
- Sticky on scroll

#### 2. Hero Section
- Headline: "Dá uma Segunda Oportunidade a um Cão" (Give a Dog a Second Chance)
- Subtext: Emotional copy about every dog deserving a loving home
- Primary CTA button: "Encontra o teu companheiro" (Find your companion) → links to /caes
- Background: warm, inviting hero image (dog photo or illustration)

#### 3. Impact Stats Bar
- Three animated counters:
  - 315 Cães Esterilizados (Dogs Sterilized)
  - 419 Cães Adotados (Dogs Adopted)
  - 135 Cães no Abrigo (Dogs in Shelter)
- Numbers animate on scroll into view (count-up effect)
- **Note:** These stats should be editable by admin in future, but can be hardcoded for v1

#### 4. Why Adopt Section (Porque Adotar?)
- Three benefit cards with icons:
  - **Amor Incondicional** — Unconditional Love
  - **Experiência Gratificante** — Rewarding Experience
  - **Alegria e Sorrisos** — Joy and Smiles
- Each card: icon + title + short description paragraph

#### 5. Featured Dogs Section (Os Nossos Cães)
- **React island** — fetches dogs from Supabase at runtime
- Size category tabs/filters: Pequenos (Small) / Médios (Medium) / Grandes (Large)
- Dog cards in a responsive grid (3 cols desktop, 2 tablet, 1 mobile)
- Each card: photo, name, size badge, short description
- "Ver todos os cães" (See all dogs) CTA → links to /caes
- Show max 6 dogs on homepage (2 per size category, or most recent)

#### 6. About Blurb (Sobre Nós)
- Short paragraph about CAPA's mission: fighting abandonment, rescuing dogs, volunteer-driven
- "Saber Mais" (Learn More) button → links to /sobre-nos

#### 7. Help CTA Section (Quer Ajudar?)
- Headline: "Quer Ajudar?" (Want to Help?)
- Copy about ways to contribute: donations, volunteering, fostering, responsible adoption
- CTA button: "Saiba como ajudar" → links to /ajudar

#### 8. Footer
- CAPA contact info (address, phone, email)
- Social media links
- Quick nav links
- "© 2026 CAPA Póvoa de Lanhoso"

---

### Supabase Schema (for dog listings)

#### Table: `dogs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Dog's name |
| size | text | 'small', 'medium', 'large' |
| sex | text | 'male', 'female' (added later) |
| age | text | e.g., "2 anos", "6 meses" |
| description | text | Short bio in Portuguese |
| photo_url | text | URL from Supabase Storage |
| is_adopted | boolean | Default false, hides from listings |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

#### Storage Bucket: `dog-photos`
- Public read access (no auth needed to view)
- Write access: authenticated admins only

#### RLS Policies
- `dogs` table: public SELECT, authenticated INSERT/UPDATE/DELETE
- Storage: public GET, authenticated POST/DELETE

---

### Design Direction

- Warm, inviting, emotional — this is a charity, not a tech company
- Soft color palette: warm tones (think earth tones, soft oranges/browns, greens)
- Reference the current site's feel but modernize it
- Mobile-first responsive design
- Accessible (proper contrast, alt text on images, semantic HTML)
- Portuguese typography: ensure proper rendering of accented characters

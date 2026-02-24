---
priority: "1st"
category: "engineering"
tags: ["frontend", "astro", "react", "landing-page", "supabase"]
created: "2026-02-24"
---

# Landing Page — capapvl.pt

## Overview

Build the homepage for CAPA Póvoa de Lanhoso's dog shelter website. This is the primary public-facing page that drives adoption interest, showcases available dogs, and communicates the shelter's mission.

**Reference:** https://capapvl.pt/ (current Tilde-built site being replaced)
**Language:** Portuguese (PT) throughout

---

## Tech Stack

- Astro 5 + React 19 islands
- Tailwind CSS 3
- Bun (runtime)
- Supabase (database + storage for dog listings)

---

## Page Sections (top to bottom)

### 1. Navigation Header
- CAPA logo/name
- Nav links: Início, Os Nossos Cães, Sobre Nós, Ajudar
- Mobile hamburger menu
- Sticky on scroll

### 2. Hero Section
- Headline: "Dá uma Segunda Oportunidade a um Cão" (Give a Dog a Second Chance)
- Subtext: Emotional copy about every dog deserving a loving home
- Primary CTA button: "Encontra o teu companheiro" (Find your companion) → links to /caes
- Background: warm, inviting hero image (dog photo or illustration)

### 3. Impact Stats Bar
- Three animated counters:
  - 315 Cães Esterilizados (Dogs Sterilized)
  - 419 Cães Adotados (Dogs Adopted)
  - 135 Cães no Abrigo (Dogs in Shelter)
- Numbers animate on scroll into view (count-up effect)
- **Note:** These stats should be editable by admin in future, but can be hardcoded for v1

### 4. Why Adopt Section (Porque Adotar?)
- Three benefit cards with icons:
  - **Amor Incondicional** — Unconditional Love
  - **Experiência Gratificante** — Rewarding Experience
  - **Alegria e Sorrisos** — Joy and Smiles
- Each card: icon + title + short description paragraph

### 5. Featured Dogs Section (Os Nossos Cães)
- **React island** — fetches dogs from Supabase at runtime
- Size category tabs/filters: Pequenos (Small) / Médios (Medium) / Grandes (Large)
- Dog cards in a responsive grid (3 cols desktop, 2 tablet, 1 mobile)
- Each card: photo, name, size badge, short description
- "Ver todos os cães" (See all dogs) CTA → links to /caes
- Show max 6 dogs on homepage (2 per size category, or most recent)

### 6. About Blurb (Sobre Nós)
- Short paragraph about CAPA's mission: fighting abandonment, rescuing dogs, volunteer-driven
- "Saber Mais" (Learn More) button → links to /sobre-nos

### 7. Help CTA Section (Quer Ajudar?)
- Headline: "Quer Ajudar?" (Want to Help?)
- Copy about ways to contribute: donations, volunteering, fostering, responsible adoption
- CTA button: "Saiba como ajudar" → links to /ajudar

### 8. Footer
- CAPA contact info (address, phone, email)
- Social media links
- Quick nav links
- "© 2026 CAPA Póvoa de Lanhoso"

---

## Supabase Schema (for dog listings)

### Table: `dogs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Dog's name |
| size | text | 'small', 'medium', 'large' |
| age | text | e.g., "2 anos", "6 meses" |
| description | text | Short bio in Portuguese |
| photo_url | text | URL from Supabase Storage |
| is_adopted | boolean | Default false, hides from listings |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### Storage Bucket: `dog-photos`
- Public read access (no auth needed to view)
- Write access: authenticated admins only

### RLS Policies
- `dogs` table: public SELECT, authenticated INSERT/UPDATE/DELETE
- Storage: public GET, authenticated POST/DELETE

---

## Design Direction

- Warm, inviting, emotional — this is a charity, not a tech company
- Soft color palette: warm tones (think earth tones, soft oranges/browns, greens)
- Reference the current site's feel but modernize it
- Mobile-first responsive design
- Accessible (proper contrast, alt text on images, semantic HTML)
- Portuguese typography: ensure proper rendering of accented characters

---

## Project Setup (included in this task)

- Initialize Astro 5 project with React + Tailwind integrations
- Configure Bun as runtime
- Set up Supabase client library
- Create `.env.example` with required Supabase vars
- Set up project structure following Astro conventions
- Initialize git repo

---

## Success Criteria

- [ ] Astro project scaffolded and builds clean with Bun
- [ ] All 8 sections rendered on homepage
- [ ] Featured dogs section fetches from Supabase (React island)
- [ ] Size filter works (small/medium/large tabs)
- [ ] Dog cards display photo, name, size, description
- [ ] Stats counters animate on scroll
- [ ] Fully responsive (mobile, tablet, desktop)
- [ ] Navigation works with mobile hamburger
- [ ] All copy in Portuguese
- [ ] Supabase schema created (dogs table + storage bucket)
- [ ] `.env.example` documented
- [ ] Builds successfully on Bun

---

## Out of Scope (separate tasks)

- Admin panel (CRUD for dogs) — separate task
- About page (/sobre-nos) — separate task
- Help page (/ajudar) — separate task
- Full dog listings page (/caes) — separate task
- Deployment setup — separate task
- SEO / meta tags — can be added later
- Contact form — separate task

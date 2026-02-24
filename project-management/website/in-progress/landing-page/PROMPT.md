# Build Prompt — CAPA PVL Landing Page

## Context

We're building a dog shelter website for **CAPA Póvoa de Lanhoso** (capapvl.pt), a Portuguese non-profit rescue/adoption org. The current site is on Tilde (website builder) and we're replacing it with a custom build. This task is the homepage/landing page.

## Your Task

Scaffold the Astro project and build the complete landing page. Read these files first:

1. `~/projects/capapvl.pt/PROJECT.md` — stack, architecture, full project context
2. `~/projects/capapvl.pt/project-management/website/backlog/landing-page/SPEC.md` — detailed section-by-section spec with Supabase schema
3. The current site for visual reference: https://capapvl.pt/

## Stack

- **Astro 5** + **React 19** islands + **Tailwind CSS 3**
- **Bun** runtime (not npm/yarn)
- **Supabase** client for dog listings (React island fetches at runtime)

## What to Build

**Project setup:**
- Init Astro 5 with React + Tailwind integrations using Bun
- Set up Supabase client library (`@supabase/supabase-js`)
- Create `.env.example` with `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- Init git repo

**Landing page sections (top to bottom):**
1. **Nav** — sticky header, CAPA logo/name, links (Início, Os Nossos Cães, Sobre Nós, Ajudar), mobile hamburger
2. **Hero** — "Dá uma Segunda Oportunidade a um Cão" headline, emotional subtext, CTA button
3. **Stats bar** — 3 animated counters (315 sterilized / 419 adopted / 135 in shelter), count-up on scroll
4. **Why Adopt** — 3 benefit cards with icons (Amor Incondicional, Experiência Gratificante, Alegria e Sorrisos)
5. **Featured Dogs** — **React island** fetching from Supabase, size filter tabs (Pequenos/Médios/Grandes), dog cards with photo/name/size/description, max 6 on homepage
6. **About blurb** — CAPA mission paragraph + "Saber Mais" link
7. **Help CTA** — "Quer Ajudar?" section with ways to contribute + CTA button
8. **Footer** — contact info, social links, quick nav, copyright

**Supabase schema (create migration or document):**
- `dogs` table: id (uuid), name, size ('small'/'medium'/'large'), age, description, photo_url, is_adopted (bool), created_at, updated_at
- `dog-photos` storage bucket (public read, authenticated write)
- RLS: public SELECT on dogs, authenticated INSERT/UPDATE/DELETE

## Design Direction

- Warm, inviting, emotional — soft earth tones, oranges/browns, greens
- This is a charity, not a tech startup
- Mobile-first responsive
- All copy in Portuguese
- Accessible (proper contrast, alt text, semantic HTML)
- Reference the current site's vibe but modernize it

## Rules

- Use `bun` for all installs and scripts
- Match Astro conventions (layouts, pages, components)
- Featured dogs section must be a React island (`client:load` or `client:visible`)
- All other sections can be static Astro components
- Create seed data for 6+ dogs so the listing works without a live Supabase instance
- Working directory: `~/projects/capapvl.pt/`
- After finishing: update `~/projects/capapvl.pt/CHANGELOG.md` with your progress
- Move the task from `backlog` to `in-progress` when you start: `mv ~/projects/capapvl.pt/project-management/website/backlog/landing-page ~/projects/capapvl.pt/project-management/website/in-progress/`

## Success Criteria

- `bun run build` succeeds
- `bun run dev` shows all 8 sections rendered
- Dog listing fetches from Supabase (or gracefully falls back to seed data)
- Size filter tabs work
- Stats counters animate on scroll
- Fully responsive (mobile/tablet/desktop)
- Mobile hamburger nav works
- All copy in Portuguese

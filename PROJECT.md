# CAPA PVL — capapvl.pt

Dog shelter website for **CAPA Póvoa de Lanhoso** (Clube de Adoção e Proteção Animal), a Portuguese non-profit rescue/shelter/adoption organization.

**Live (current):** https://capapvl.pt/ (Tilde website builder — being replaced)

---

## Stack

- **Framework:** Astro 5 + React 19 islands
- **Styling:** Tailwind CSS 3
- **Runtime:** Bun
- **Backend:** Supabase (Auth, Database, Storage)
  - Auth: admin login for shelter staff (email/password)
  - Database: dogs table (name, size, age, description, photos, status)
  - Storage: dog photos bucket
- **Hosting:** Hostinger (static)
- **Deploy:** Build on `main`, copy `dist/` to orphan `deploy` branch, push

## Architecture

- Static Astro pages for public content (Home, About, Help/Donate)
- React islands for dynamic content:
  - Dog listings (fetches from Supabase, filterable by size)
  - Admin panel (protected behind Supabase auth — CRUD dogs)
- All dog data lives in Supabase — no rebuild needed when dogs are added/removed
- Images stored in Supabase Storage bucket

## Pages

| Page | Route | Notes |
|------|-------|-------|
| Home | `/` | Hero, stats, why adopt, featured dogs, about blurb, help CTA |
| About | `/sobre-nos` | Mission, rescue process, volunteers |
| Help | `/ajudar` | Foster families (FATs), donations, volunteering |
| Dogs | `/caes` | Full dog listings with size filter (small/medium/large) |
| Admin | `/admin` | Protected — add/edit/remove dogs, manage photos |

## Language

- Portuguese (PT) — all public-facing content
- Admin panel can be in English or Portuguese (TBD)

## Key Features

- Dog listings by size category (Pequenos / Médios / Grandes)
- Impact stats counters (sterilized / adopted / in shelter)
- Admin CRUD for dogs (add, edit, remove, manage photos)
- Foster family (FAT) program info
- Responsive, mobile-friendly

## Gotchas

- Supabase free tier: 500MB storage, watch photo sizes
- Hostinger is static-only — no SSR, all dynamic content via client-side React + Supabase
- Dog photos need optimization before upload (or use Supabase transforms)

## Decision Log

- 2026-02-24: Chose Astro + React + Supabase + Hostinger stack. Matches existing project patterns (Build to Own Club uses same stack). Admin panel is a React island behind Supabase auth, not a separate app. (Crash & Burn)

# CAPA PVL — capapvl.pt

Dog shelter website for **CAPA Póvoa de Lanhoso** (Clube de Adoção e Proteção Animal), a Portuguese non-profit rescue/shelter/adoption organization.

**Live (current):** https://capapvl.pt/ (Tilde website builder — being replaced)

---

## Stack

- **Framework:** Astro 5 + React 19 islands
- **Styling:** Tailwind CSS 4 (CSS-first config, @theme blocks)
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

## Design Direction (Z-Approved)

**Z loves the current design. Use this style for ALL remaining pages.**

- **Palette:** Warm earth tones — primary (orange), warm (brown), nature (green)
  - Defined in `src/styles/global.css` via `@theme` blocks
  - Primary: `primary-50` through `primary-900` (orange spectrum)
  - Warm: `warm-50` through `warm-900` (brown/cream spectrum)
  - Nature: `nature-50` through `nature-900` (green spectrum)
- **Vibe:** Warm, inviting, emotional — charity energy, not tech startup
- **Backgrounds:** White/cream alternating sections (`warm-50`, `warm-100`, white)
- **Cards:** Rounded corners (`rounded-2xl`), soft shadows, warm borders
- **Typography:** Inter font family, bold headings in `warm-900`
- **Buttons:** Primary orange (`primary-500`), rounded (`rounded-xl`), with hover transitions
- **Size badges:** Green for Pequeno, orange for Médio, brown for Grande
- **Mobile-first:** Always responsive, hamburger nav on mobile
- **Accessibility:** Semantic HTML, ARIA labels, good contrast, alt text

## Decision Log

- 2025-07-26: Z approved landing page design — warm earth tones, soft palette. Carry this style forward to all pages. (Crash & Burn)
- 2026-02-24: Chose Astro + React + Supabase + Hostinger stack. Matches existing project patterns (Build to Own Club uses same stack). Admin panel is a React island behind Supabase auth, not a separate app. (Crash & Burn)

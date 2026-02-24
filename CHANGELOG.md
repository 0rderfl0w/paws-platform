# CHANGELOG — capapvl.pt

## 2026-02-24
- Built `/caes` page: DogListings React island with size filter tabs, name search, results count, responsive grid, loading skeletons, seed data fallback (Crash & Burn)
- Built `/sobre-nos` page: hero, Stats reuse, 3 principles cards, community/schools, rescue & rehab, success stories CTA (Crash & Burn)
- Built `/ajudar` page: Donativos em Género (4 cards), Doação de Tempo (4 volunteer cards), FAT foster section, Donativos Monetários with IBAN + MBWay + PayPal (Crash & Burn)
- Built `/adocao` page: 6 benefits grid, 6-step adoption timeline, 3 pricing cards (Fêmea 75€/Macho 65€/Bebé 30€), success stories (Crash & Burn)
- Updated Nav with Adoção link, Footer with real contact info (capa.geralpvl@gmail.com, EN310 115 address, IBAN) (Crash & Burn)
- Expanded seed data to 12 real dogs from shelter (4 per size) with real names/ages/descriptions (Crash & Burn)
- Created Supabase migration: dogs table + RLS policies + dog-photos storage bucket (Crash & Burn)
- Scraped 104 dogs (1,083 photos) from existing site into organized folders (Crash & Burn)
- Scraped page content from /adocao, /sobre_nos, /ajudar for reference (Crash & Burn)
- All 5 pages build clean: `bun run build` — 662ms (Crash & Burn)

## 2025-07-26
- Scaffolded Astro 5 project with React 19, Tailwind CSS 4, Supabase client, Bun runtime (Crash & Burn)
- Note: Astro 5's official integration installs TW4 (not TW3). Using TW4 with CSS-first config — correct for new projects (Crash & Burn)
- Set up Supabase client lib, Dog type, seed data for 6 dogs (2 per size category) (Crash & Burn)
- Created warm earth-tone color palette: primary (orange), warm (brown), nature (green) (Crash & Burn)
- Built all 8 landing page sections: Nav (sticky + mobile hamburger), Hero, Stats (animated counters with IntersectionObserver), WhyAdopt (3 benefit cards), FeaturedDogs (React island with Supabase fetch + seed fallback + size filter tabs), AboutBlurb, HelpCta, Footer (Crash & Burn)
- FeaturedDogs uses client:visible for lazy loading, loading skeletons, empty states (Crash & Burn)
- `bun run build` clean — zero errors (Crash & Burn)
- Init git repo (Crash & Burn)

## 2026-02-24
- Project created. Stack: Astro 5 + React 19 + Tailwind 3 + Supabase + Bun. Hosted on Hostinger. (Crash & Burn)
- Researched current capapvl.pt site structure — hero, stats, why adopt, dog listings by size, about, help/FAT program (Crash & Burn)
- Created landing-page task spec (Crash & Burn)

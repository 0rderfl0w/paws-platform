---
title: "feat: Add Playful Impact test landing page"
type: feat
date: 2026-06-21
---

# feat: Add Playful Impact test landing page

## Summary

Create `/test-landing` as a production-accessible test version of the CAPA homepage that keeps the current landing page copy, section order, routing, dog data behavior, and footer information while applying the uploaded Playful Impact visual concept.

The live `/` homepage remains untouched until the test route is reviewed.

---

## Problem Frame

The uploaded design concept demonstrates a stronger CAPA visual direction: cream canvas, Sora/Plus Jakarta Sans typography, juicy orange CTAs, soft peach containers, watermelon accents, blob masks, pillowy shadows, slight rotations, and squishy interactions. The concept does not include every live homepage section and includes mockup copy/static dog cards, so the implementation must translate the design language onto the existing CAPA landing flow rather than replacing the product content.

---

## Requirements

**Route and scope**

- R1. Add `/test-landing` as a separate route and do not modify the existing `/` route behavior.
- R2. Preserve the current Portuguese homepage flow: nav, hero, stats, why adopt, featured dogs, about blurb, help CTA, and footer.
- R3. Preserve current copywriting from the existing i18n strings and avoid mockup-only copy such as English CTA text or Brazilian phrasing.

**Design translation**

- R4. Apply the Playful Impact visual system: Creamy Canvas background, Juicy Orange primary actions, Soft Peach containers, Watermelon accents, Sora headings, Plus Jakarta Sans body copy, large radius shapes, organic blobs, pillowy shadows, and subtle rotations.
- R5. Add squishy hover/active states and animated decorative elements while respecting reduced-motion preferences.
- R6. Use local CAPA assets and real dog data instead of remote mockup images or hardcoded sample dogs.

**Behavior and deployment**

- R7. Keep featured dogs backed by the existing Hetzner API plus committed fallback data, with filters and dog profile links intact.
- R8. Build successfully with Bun/Astro and deploy the built static output to the Hetzner nginx root.
- R9. Verify `/test-landing` visually with screenshots before deployment and verify the live URL after deployment.

---

## Key Technical Decisions

- **Isolated test route:** Implement the redesign under `src/pages/test-landing.astro` with namespaced test-landing components so the current live homepage remains stable.
- **Design reference, not source transplant:** Do not paste the uploaded HTML into the app because it uses CDN Tailwind, placeholder images, mockup copy, and static dogs that bypass existing Astro/Tailwind/i18n/data patterns.
- **Scoped Playful styling:** Add Playful Impact helpers and tokens in a way that only the new route consumes them, avoiding broad palette/font changes across admin, dog listing, and existing content pages.
- **React island parity:** Keep featured dogs as a React island using the existing API/fallback pattern rather than replacing it with static cards.
- **Production noindex:** Mark `/test-landing` as noindex because it is a review surface, not the canonical homepage.

---

## Implementation Units

### U1. Add the isolated `/test-landing` route shell

- **Goal:** Create the test landing route with the same high-level flow as the current homepage.
- **Requirements:** R1, R2, R3, R9
- **Dependencies:** none
- **Files:**
  - `src/pages/test-landing.astro`
  - `src/layouts/Layout.astro`
- **Approach:** Reuse `Layout` with `noindex` and route-specific classes/slots where needed. Import test-landing components in the same order as `src/pages/index.astro` so review compares design treatment without content-flow drift.
- **Patterns to follow:** `src/pages/index.astro`, `src/layouts/Layout.astro`
- **Test scenarios:**
  - `Test expectation: none -- route shell and SEO metadata are verified through Astro build output and browser inspection because the project has no route-level test suite.`
- **Verification:** `bun run build` emits a built `/test-landing/index.html`, and `/` remains present in the build output.

### U2. Add scoped Playful Impact styling primitives

- **Goal:** Provide reusable design helpers for the test landing without changing existing pages globally.
- **Requirements:** R4, R5
- **Dependencies:** U1
- **Files:**
  - `src/styles/global.css`
  - `src/layouts/Layout.astro`
- **Approach:** Add additive CSS custom properties/utilities for Playful colors, dotted background, blob masks, ambient blobs, pillowy shadows, squishy interactions, polaroid cards, and reduced-motion fallbacks. Add Sora and Plus Jakarta Sans to the font import without removing existing Inter compatibility.
- **Patterns to follow:** Tailwind 4 CSS-first `@theme` usage in `src/styles/global.css`; existing `Layout.astro` font import pattern
- **Test scenarios:**
  - `Test expectation: none -- this is additive styling. Verify by build, screenshot, and confirming existing pages still render.`
- **Verification:** New classes compile in Tailwind output, no existing class names are removed, and browser screenshots show the Playful typography/background on `/test-landing` only.

### U3. Build Playful static Astro sections around current copy

- **Goal:** Redesign nav, hero, stats, why-adopt, about, help CTA, and footer sections using current CAPA copy and links.
- **Requirements:** R2, R3, R4, R5, R6
- **Dependencies:** U1, U2
- **Files:**
  - `src/components/test-landing/PlayfulNav.astro`
  - `src/components/test-landing/PlayfulHero.astro`
  - `src/components/test-landing/PlayfulStats.astro`
  - `src/components/test-landing/PlayfulWhyAdopt.astro`
  - `src/components/test-landing/PlayfulAboutBlurb.astro`
  - `src/components/test-landing/PlayfulHelpCta.astro`
  - `src/components/test-landing/PlayfulFooter.astro`
- **Approach:** Pull copy through `getTranslations('pt')`, preserve links to `/caes`, `/adocao`, `/sobre-nos`, and `/ajudar`, and translate the design concept into organic cards, blob image treatments, sticker pills, and pill-shaped CTAs. Keep the four existing help paths even though the mockup shows three action cards.
- **Patterns to follow:** Existing component copy/data patterns in `src/components/Hero.astro`, `src/components/Stats.astro`, `src/components/WhyAdopt.astro`, `src/components/AboutBlurb.astro`, `src/components/HelpCta.astro`, `src/components/Footer.astro`
- **Test scenarios:**
  - Verify the hero headline and CTAs match the current Portuguese homepage copy.
  - Verify stats retain 315, 419, and 135 rather than mockup zeroes.
  - Verify the help section includes Adotar, Apadrinhar, Voluntariar, and Doar.
  - Verify footer keeps contact details, social links, and IBAN.
- **Verification:** Browser inspection and screenshots show the full preserved flow, no missing live-homepage sections, and no mockup-only text.

### U4. Build Playful featured dogs React island

- **Goal:** Restyle featured dogs as playful polaroid cards while preserving real dog data, filters, adopted states, and profile links.
- **Requirements:** R3, R4, R5, R6, R7
- **Dependencies:** U1, U2
- **Files:**
  - `src/components/test-landing/PlayfulFeaturedDogs.tsx`
- **Approach:** Adapt `FeaturedDogs.tsx` into a test-landing variant that keeps `capaApi`, `capaDogs`, `localizeDescription`, filter tabs, loading/empty states, and `/cao?id=` links. Use explicit rotation class maps so Tailwind generates all visual variants.
- **Patterns to follow:** `src/components/FeaturedDogs.tsx`, `src/lib/capaApi.ts`, `src/data/capaDogs.ts`
- **Test scenarios:**
  - Verify fallback dogs render when the API is unavailable.
  - Verify API dogs replace fallback dogs when `PUBLIC_CAPA_API_URL=https://api.capapvl.org` is set.
  - Verify size filters still change the visible card set.
  - Verify every dog card links to `/cao?id={uuid}` and adopted dogs retain their adopted overlay when present.
- **Verification:** Local preview confirms dog cards render with real photos and interactive filters, and the production build includes the island JS without TypeScript errors.

### U5. Verify, deploy, and document

- **Goal:** Prove the test landing works locally, deploy it, and record the change.
- **Requirements:** R8, R9
- **Dependencies:** U1, U2, U3, U4
- **Files:**
  - `CHANGELOG.md`
  - `../websites/CHANGELOG.md`
- **Approach:** Run the production build with the production API URL and an asset version, preview `/test-landing`, capture desktop and mobile screenshots, fix visible issues, sync `dist/` to `/home/deploy/apps/capapvl`, verify the live route, then update project and websites changelogs.
- **Patterns to follow:** Deploy commands and verification guidance in `AGENTS.md`; existing changelog entry style in `CHANGELOG.md` and `../websites/CHANGELOG.md`
- **Test scenarios:**
  - Verify local `/test-landing/` returns 200 in preview.
  - Verify screenshots at desktop and mobile widths show no horizontal overflow, clipped text, broken images, or missing sections.
  - Verify live `https://capapvl.org/test-landing/` returns 200 after deploy.
  - Verify live `/` still returns 200 after deploy.
- **Verification:** Build output, screenshot files, HTTP status checks, and changelog diffs are available before final report.

---

## Risks & Dependencies

- **Visual scope bleed:** Global font/token changes could affect existing pages. Mitigate by adding additive helpers and consuming them only inside test-landing components.
- **Tailwind class pruning:** Dynamically constructed class names may not compile. Mitigate with explicit class maps for rotations, colors, and badges.
- **Mockup content drift:** The design concept contains altered copy and static dog cards. Mitigate by pulling all copy/data from existing i18n/API/fallback sources.
- **Immutable assets:** Live nginx serves `/_astro/*` as immutable. Mitigate by using `CAPA_ASSET_VERSION` during production build.

---

## Sources / Research

- Existing homepage entrypoint: `src/pages/index.astro`
- Existing component patterns: `src/components/Hero.astro`, `src/components/Stats.astro`, `src/components/WhyAdopt.astro`, `src/components/FeaturedDogs.tsx`, `src/components/AboutBlurb.astro`, `src/components/HelpCta.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`
- Existing copy source: `src/i18n/pt.ts`
- Styling system: `src/styles/global.css`
- Deployment and project constraints: `AGENTS.md`
- Design source: uploaded Playful Impact concept with `DESIGN.md`, `code.html`, and screenshot

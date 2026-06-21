---
title: "feat: Redesign Caes listing with Playful Impact"
type: feat
date: 2026-06-21
---

# feat: Redesign Caes listing with Playful Impact

## Summary

Redesign the live Portuguese `/caes` dog-listing route with CAPA's Playful Impact system while preserving the existing hero copy, search/filter labels, results text, dog cards, adopted banners, API-backed data behavior, and committed fallback data.

Because the listing island and language switcher are already shared with English routing, this plan includes `/en/dogs` parity where needed so the redesigned dog-listing experience remains consistent across locales.

---

## Problem Frame

`/caes` is CAPA's primary conversion page for people who want to adopt. The current page works functionally, but it still uses the older warm-earth chrome, a small text-only hero, and a long utilitarian card grid. The hero does not feel like the emotional entry point to nearly one hundred adoptable dogs, and the listing UI does not yet match the tactile Playful Impact system documented in `DESIGN.md` and shipped on `/ajudar` and `/sobre-nos`.

The redesign should make the first viewport feel like an adoption poster, then make the search, filters, results count, dog cards, loading state, empty state, and adopted treatment feel intentionally Playful without changing the underlying dog data contract.

---

## Assumptions

- The user named `https://capapvl.org/caes` as the target. A clarification prompt about locale scope timed out, so the plan treats `/caes` as primary and includes `/en/dogs` parity only where shared route chrome, metadata, and `DogListings` locale behavior make parity the safer implementation path.
- The plan does not include `/cao?id=...` or `/en/dog?id=...` profile redesign work. Profile pages remain in the current style unless a later request expands scope.
- Hero imagery should come from existing real CAPA dog photography or a local collage derivative, not abstract stock art or AI-looking animal imagery.

---

## Requirements

**Route, copy, and data preservation**

- R1. Redesign the existing live `/caes` route directly; do not create a separate test or review page.
- R2. Preserve all current visible Portuguese page copy: `Prontos para adoção`, `Os Nossos Cães`, the two-sentence hero paragraph, search placeholder, size filters, sex filters, results text, empty-state copy, clear-filters copy, dog names, ages, descriptions, size labels, and `Adotado!` banners.
- R3. Preserve English `/en/dogs` copy where parity is touched: `Ready for adoption`, `Our Dogs`, the hero paragraph, search/filter/results/empty-state labels, dog names, translated card descriptions, size labels, and `Adopted!` banners.
- R4. Preserve `DogListings` data behavior: committed `capaDogs` fallback renders first, the Hetzner API updates when available, `capaApi.getDogs(true)` keeps adopted dogs visible, and dog profile links continue using `/cao?id=` and `/en/dog?id=`.
- R5. Preserve current filtering behavior: name search, size tabs, sex tabs, combined filtering, reset from the empty state, and the one-vs-many results text.

**Playful Impact redesign**

- R6. Apply the Playful Impact system from `DESIGN.md`: cream canvas, Sora/Plus Jakarta Sans, high-contrast orange actions, peach/watermelon accents, organic dog imagery, pillowy cards, rounded filter pills, soft-brutalist rotations, and squishy interactions.
- R7. Rebuild the hero as a strong adoption-poster first viewport with a dominant real-dog visual, high-impact heading hierarchy, clear emotional framing, and scannable trust/status badges.
- R8. Restyle the listing controls as a tactile filter dock that remains readable, keyboard-accessible, and obvious on mobile.
- R9. Restyle dog cards with Playful image frames, accessible labels, visible adopted treatment, and clear clickable affordance without hiding or truncating critical dog identity information.

**Accessibility, performance, and motion**

- R10. Keep semantic landmarks, heading order, meaningful image alt text, visible focus states, touch targets, and WCAG AA contrast for interactive text.
- R11. Keep the hero and LCP image visible without waiting for scroll-reveal JavaScript; use reveal motion mainly below the fold and for dynamic listing cards after hydration.
- R12. Respect `prefers-reduced-motion` and never leave React-rendered dog cards hidden, blurred, or shifted after hydration.
- R13. Avoid horizontal overflow on mobile despite rotated cards, pill filters, adopted banners, and long dog names/descriptions.

**Operational safety**

- R14. Keep Playful styling additive and scoped to redesigned dog-listing routes so older routes and admin behavior do not regress.
- R15. Keep `/caes` and `/en/dogs` indexable; do not copy `/test-landing` `noindex` behavior.
- R16. Update stale `capapvl.pt` Open Graph URLs to the canonical `capapvl.org` routes for the dog-listing pages.
- R17. Add verification that catches removed copy, broken API/fallback behavior, stale Astro asset references, adopted-badge regressions, reveal-hidden content, and live deployment drift.

---

## Key Technical Decisions

- **Shared dog-listing parity, not profile redesign:** Redesign `/caes` and `/en/dogs` together where the same `DogListings` island and Playful chrome are involved, but leave profile pages out of scope to keep the direct route rewrite bounded.
- **Static hero plus dynamic listing island:** Keep the hero in Astro so the first viewport is fast, indexable, and visible without JavaScript; keep the dog grid/search/filter experience in React because it already owns client-side API fallback, filtering, and dog-card rendering.
- **Keep `client:load` for the listing island:** The listing is the page's main task and users may scroll to it immediately. Retain eager hydration unless implementation proves the new hero makes `client:visible` safe without delaying filters or dog cards.
- **Hero image from committed dog photos:** Create a local hero derivative or collage from real committed dog photos under `public/images/dogs/`, with candidates such as Abby, Bernardo, Chico, Bailey, Ayla, Nick, Ninja, Serena, Tom, or Zoe. Use WebP plus JPEG fallback under `public/images/caes/` so the hero is independent of API availability.
- **Reuse Playful dog-card language without destabilizing data flow:** Borrow the card/frame/filter treatment from `src/components/test-landing/PlayfulFeaturedDogs.tsx`, but do not merge data-fetching concerns across homepage, test landing, and full listings. Extract only pure card/helper pieces if reuse is straightforward.
- **Dynamic reveal needs `observeDynamic`:** If dog cards receive `data-reveal`, the page must use `PlayfulScrollReveal` with dynamic observation so React-inserted cards reveal correctly. Cap stagger delays and avoid hiding the hero itself to reduce paint/LCP risk.
- **Browser smoke over static-only smoke:** Built HTML cannot prove the hydrated dog grid, API fallback, filters, and adopted banners. Add static content checks, then verify hydrated DOM behavior through browser smoke during implementation and deployment QA.

---

## High-Level Technical Design

```mermaid
flowchart TB
  PT[Route /caes] --> Shell[Playful listing shell]
  EN[Route /en/dogs] --> Shell
  Shell --> Nav[PlayfulSiteNav]
  Shell --> Footer[PlayfulSiteFooter]
  Shell --> Reveal[PlayfulScrollReveal]
  Shell --> Hero[Static adoption-poster hero]
  Shell --> Listing[DogListings React island]

  Hero --> HeroAsset[Local real-dog WebP/JPEG asset]
  Listing --> Fallback[Committed capaDogs fallback]
  Listing --> API[Hetzner API getDogs true]
  Listing --> Filters[Search + size + sex filters]
  Listing --> Cards[Playful dog cards]
  Cards --> Profiles[/cao?id= and /en/dog?id=]

  Verify[Static + browser smoke] --> PT
  Verify --> EN
  Verify --> API
```

---

## Scope Boundaries

### In scope

- Direct redesign of `/caes` and parity-safe updates for `/en/dogs`.
- New Playful dog-listing hero and local dog-photo hero derivative or collage asset.
- Restyling of search, filters, results count, loading skeletons, empty state, dog cards, and adopted badges.
- Route-scoped Playful nav/footer/reveal usage consistent with `/ajudar` and `/sobre-nos`.
- Verification for static copy, hydrated dog-grid behavior, API/fallback behavior, screenshots, deployment, and changelog.

### Out of scope

- Redesigning dog profile pages (`/cao`, `/en/dog`).
- Changing dog database schema, API endpoints, admin CRUD behavior, upload behavior, or photo storage conventions.
- Changing which dogs are available/adopted/deceased.
- Rewriting adoption process copy or donation/help strategy.
- Creating a noindex test page.

### Deferred to Follow-Up Work

- Fully unifying `DogListings`, `FeaturedDogs`, and `PlayfulFeaturedDogs` into one shared dog-card/listing system across the whole site.
- Deep optimization of all 941 dog photos beyond the route-specific hero derivative and any low-risk card-level loading improvements.
- Playful redesign of `/cao`, `/en/dog`, `/adocao`, and `/en/adopt`.

---

## Implementation Units

### U1. Move dog-listing routes onto Playful chrome

- **Goal:** Put `/caes` and `/en/dogs` inside the same route-aware Playful shell now used by the redesigned static pages.
- **Requirements:** R1, R3, R6, R10, R14, R15, R16
- **Dependencies:** none
- **Files:**
  - `src/pages/caes.astro`
  - `src/pages/en/dogs.astro`
  - `src/components/playful/PlayfulSiteNav.astro`
  - `src/components/playful/PlayfulSiteFooter.astro`
  - `src/components/playful/PlayfulScrollReveal.astro`
  - `src/styles/global.css`
  - `scripts/verify-caes-content.mjs`
- **Approach:** Use `Layout` with `playfulFonts`, switch legacy `Nav`/`Footer` to Playful site chrome, wrap the route in a `data-playful-scroll-reveal` Playful container, and update canonical Open Graph URLs to `https://capapvl.org/caes` and `https://capapvl.org/en/dogs`. Preserve route paths and language-switch mapping.
- **Patterns to follow:** `src/pages/ajudar.astro`, `src/pages/sobre-nos.astro`, `src/components/playful/PlayfulSiteNav.astro`, `src/components/playful/PlayfulSiteFooter.astro`, `src/components/playful/PlayfulScrollReveal.astro`, deploy guidance in `AGENTS.md`
- **Test scenarios:**
  - Open built `/caes/index.html` and `/en/dogs/index.html`; both should contain Playful fonts/chrome and no `noindex`.
  - Use desktop and mobile nav links; `Cães` / `Our Dogs` should be active without also highlighting Home.
  - Use the language switcher from `/caes`; it should target `/en/dogs`, and switching back should target `/caes`.
  - Verify built metadata uses `capapvl.org`, not stale `capapvl.pt`, for dog-listing Open Graph URLs.
- **Verification:** The two listing routes render with Playful chrome on their original URLs and do not leak `/test-landing` anchors or noindex metadata.

### U2. Build the Playful adoption-poster hero

- **Goal:** Replace the current small text-only hero with a high-impact adoption hero that preserves current hero copy.
- **Requirements:** R1, R2, R3, R6, R7, R10, R11, R13, R16
- **Dependencies:** U1
- **Files:**
  - `src/components/caes/CaesPlayfulHero.astro`
  - `src/components/caes/caesContent.ts`
  - `src/pages/caes.astro`
  - `src/pages/en/dogs.astro`
  - `public/images/caes/hero-playful-dogs.webp`
  - `public/images/caes/hero-playful-dogs-fallback.jpg`
  - `scripts/verify-caes-content.mjs`
- **Approach:** Move the PT/EN hero strings into locale-aware content data so the route files stay thin and copy preservation is testable. Compose a poster hero with oversized Sora heading, existing eyebrow/subheading copy, a real-dog image or collage, trust chips such as available/adopted/count cues derived from copy-safe labels, and a clear scroll/filter cue. Do not apply reveal styles that initially hide the headline or LCP image.
- **Patterns to follow:** `src/components/ajudar/AjudarPlayfulHero.astro`, `src/components/sobre-nos/SobreNosPlayfulHero.astro`, hero rules in `DESIGN.md`, current hero copy in `src/pages/caes.astro` and `src/pages/en/dogs.astro`
- **Test scenarios:**
  - Verify PT hero strings `Prontos para adoção`, `Os Nossos Cães`, and the full current paragraph remain visible.
  - Verify EN hero strings `Ready for adoption`, `Our Dogs`, and the full current paragraph remain visible when `/en/dogs` parity is implemented.
  - Verify the hero image is local, has dimensions, uses `loading="eager"` or equivalent above-fold priority, has meaningful locale-appropriate alt text, and has no embedded text.
  - Capture desktop and mobile hero screenshots; the dog face/collage should not be obscured by badges or cropped into an unusable abstract texture.
- **Verification:** The first viewport clearly communicates adoptable dogs and feels aligned with Playful Impact rather than the current plain centered header.

### U3. Restyle DogListings controls and cards without changing behavior

- **Goal:** Bring the hydrated listing island into the Playful Impact system while preserving search, filters, results, data, links, and adopted treatment.
- **Requirements:** R2, R3, R4, R5, R6, R8, R9, R10, R12, R13, R17
- **Dependencies:** U1, U2
- **Files:**
  - `src/components/DogListings.tsx`
  - `src/components/dogs/PlayfulDogCard.tsx`
  - `src/components/dogs/dogCardHelpers.ts`
  - `src/components/test-landing/PlayfulFeaturedDogs.tsx`
  - `scripts/verify-caes-content.mjs`
- **Approach:** Restyle the island as a Playful listing surface: rounded search field, pill filter groups, sticky-or-prominent filter dock if mobile screenshots justify it, warm results count, Playful loading skeletons, tactile empty state, and dog cards with warm frames, slight rotations, accessible focus rings, visible size/age chips, and a stronger adopted banner. Extract `getCardDescription`, size badge labels, and pure card chrome only if it avoids duplication without changing fetch/filter logic; otherwise keep the data flow inside `DogListings`.
- **Patterns to follow:** Current `src/components/DogListings.tsx`, `src/components/test-landing/PlayfulFeaturedDogs.tsx`, `src/components/FeaturedDogs.tsx`, `src/i18n/pt.ts`, `src/i18n/en.ts`, featured-dogs guidance in `DESIGN.md`
- **Test scenarios:**
  - With API available, hydrated `/caes` should render 99 dog cards and 9 adopted banners from `getDogs(true)`.
  - With the API unavailable or mocked as failed, `capaDogs` fallback should still render the committed dog set instead of an empty page.
  - Searching `Abby`, `Bella`, or `Bolt` should return `1 cão encontrado` and keep the visible `Adotado!` banner.
  - Combining size and sex filters should narrow results without resetting the search term.
  - Clearing filters from the empty state should reset name search, size filter, and sex filter.
  - Keyboard users should tab through search, every filter button, dog cards, and reset action with visible focus rings.
  - Long dog names, age chips, and three-line descriptions should not break card layout at mobile widths.
- **Verification:** The island remains functionally equivalent to the current listing while visually matching the Playful cards and controls already proven on the noindex landing page.

### U4. Add route-scoped motion safely for dynamic content

- **Goal:** Make the listing page feel alive without hurting the hero/LCP or leaving hydrated dog cards hidden.
- **Requirements:** R6, R10, R11, R12, R13, R14, R17
- **Dependencies:** U1, U2, U3
- **Files:**
  - `src/pages/caes.astro`
  - `src/pages/en/dogs.astro`
  - `src/components/DogListings.tsx`
  - `src/components/playful/PlayfulScrollReveal.astro`
  - `src/styles/global.css`
  - `scripts/verify-caes-content.mjs`
- **Approach:** Use `PlayfulScrollReveal observeDynamic={true}` only on the listing route if React cards receive reveal attributes. Keep the hero immediately visible, reveal the filter/listing shell and card groups with capped stagger delays, and ensure reduced-motion users and script failures see static content. Avoid adding per-card animations that materially slow a 99-card page.
- **Patterns to follow:** `src/pages/test-landing.astro`, `src/components/playful/PlayfulScrollReveal.astro`, reveal usage in `src/components/ajudar/*`, reveal QA lessons from `/sobre-nos`
- **Test scenarios:**
  - Scroll desktop `/caes` from top to bottom after hydration; no reveal-marked elements should remain hidden.
  - Scroll mobile `/caes`; no dog card should remain blurred, transparent, or horizontally shifted after entering the viewport.
  - Enable reduced motion; hero, filters, and cards should render immediately without transition.
  - Compare first viewport rendering with JavaScript disabled or slow; the hero copy and image should remain visible.
- **Verification:** Browser QA reports zero stuck reveal elements after full-page scroll and no obvious hero repaint/hide behavior.

### U5. Add content and browser verification for the listing route

- **Goal:** Protect the direct live route rewrite from copy, hydration, API, and deploy regressions.
- **Requirements:** R1, R2, R3, R4, R5, R10, R12, R15, R16, R17
- **Dependencies:** U1, U2, U3, U4
- **Files:**
  - `scripts/verify-caes-content.mjs`
  - `scripts/verify-ajudar-content.mjs`
  - `scripts/verify-about-content.mjs`
  - `CHANGELOG.md`
- **Approach:** Add a route-specific static smoke script for built `/caes` and `/en/dogs` HTML, checking hero copy, Playful root, local hero asset, canonical domain, language alternates, and no `noindex`. During implementation and deploy, pair that with browser-level DOM checks against local preview/live pages for card counts, filter/search behavior, adopted banners, and reveal visibility. Keep existing Ajudar/About smoke scripts passing as regression checks.
- **Patterns to follow:** `scripts/verify-ajudar-content.mjs`, `scripts/verify-about-content.mjs`, live `/caes` verification guidance in `AGENTS.md`, and the current screenshot capture workflow used for recent Playful QA
- **Test scenarios:**
  - Static smoke should fail if any current PT/EN hero copy, canonical URL, Playful root, or hero asset reference disappears.
  - Browser smoke should verify `/caes` renders the expected dog count, adopted badge count, and successful adopted-name searches.
  - Browser smoke should verify `/en/dogs` has English UI labels while dog descriptions remain localized through `localizeDescription`.
  - Existing `verify-ajudar-content.mjs` and `verify-about-content.mjs` should continue passing after any shared Playful chrome changes.
- **Verification:** The implementation report can cite both static smoke and hydrated browser behavior, not just a successful Astro build.

### U6. Deploy, visually QA, and document the live redesign

- **Goal:** Publish the direct redesign safely and leave durable project history.
- **Requirements:** R1, R10, R12, R13, R14, R15, R16, R17
- **Dependencies:** U1, U2, U3, U4, U5
- **Files:**
  - `CHANGELOG.md`
  - `docs/plans/2026-06-21-004-feat-caes-playful-impact-redesign-plan.md`
- **Approach:** Build with the production API URL and fresh asset version, preview locally, capture desktop/mobile screenshots for `/caes` and `/en/dogs`, inspect for overflow/card/filter/hero issues, deploy the generated `dist/` output through the established Hetzner static-site publish flow, and verify live HTTP, API health, cache headers, built asset filename changes, dog counts, adopted banners, and search behavior. Record the redesign and verification scope in the changelog.
- **Patterns to follow:** Deploy section in `AGENTS.md`, recent `/ajudar` and `/sobre-nos` changelog entries, previous screenshot QA workflow
- **Test scenarios:**
  - Production build completes with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh `CAPA_ASSET_VERSION`.
  - Local preview screenshots for desktop/mobile show no clipped hero, unreadable filters, horizontal overflow, hidden cards, or broken images.
  - Live `/caes/`, `/en/dogs/`, `/`, and `https://api.capapvl.org/health` return successful responses after deploy.
  - Live `/caes/` HTML returns no-cache HTML and references a fresh `DogListings` asset filename after behavior/style changes.
  - Live browser DOM checks match the expected dog/adopted counts and search examples from `AGENTS.md`.
- **Verification:** Final handoff includes commit hash, build/smoke outputs, local/live screenshot paths, live HTTP checks, API health, and live browser DOM results.

---

## Acceptance Examples

- AE1. A desktop visitor opening `/caes` sees a Playful adoption hero with the current `Prontos para adoção` / `Os Nossos Cães` message, a dominant real-dog visual, and an obvious path into the searchable listing.
- AE2. A mobile visitor can use search, size filters, and sex filters without horizontal scrolling or tiny touch targets.
- AE3. A visitor searching for an adopted dog such as Abby sees one matching card, the dog remains clickable, and the `Adotado!` banner is visible.
- AE4. If the Hetzner API is temporarily unavailable, the committed fallback dog data still renders cards rather than an empty listing.
- AE5. A reduced-motion visitor sees hero, filters, and dog cards statically with no hidden reveal state.
- AE6. A visitor switching from `/caes` to English lands on `/en/dogs` with matching Playful treatment and English UI labels.

---

## Risks & Dependencies

- **Hydrated grid regressions:** Most of the page's meaningful content is React-rendered, so static HTML checks are insufficient. Mitigation: add browser DOM checks for card counts, search, filters, and adopted banners.
- **LCP and paint cost:** Hiding the hero behind reveal animation could hurt first paint. Mitigation: keep hero content visible immediately and use reveal for below-fold/dynamic content.
- **Large image set:** The route displays many dog photos. Mitigation: keep card images lazy, do not add eager loading beyond the hero, and create only a small optimized hero derivative.
- **Shared component drift:** `DogListings`, `FeaturedDogs`, and `PlayfulFeaturedDogs` share similar card logic but have different product roles. Mitigation: extract pure helpers only when safe; do not merge fetching/filtering behavior during this redesign.
- **Immutable Astro assets:** Listing behavior/style changes can be cached for a year under `/_astro/*`. Mitigation: build with a fresh `CAPA_ASSET_VERSION` and verify live HTML references the new listing asset.

---

## Sources & Research

- `AGENTS.md` — active Hetzner workflow, React island architecture, `/caes` verification expectations, API/fallback constraints, and immutable asset cache gotcha.
- `DESIGN.md` — Playful Impact tokens, hero/card/filter/motion guidance, and QA checklist.
- `src/pages/caes.astro` and `src/pages/en/dogs.astro` — current route metadata, hero copy, and `DogListings` island usage.
- `src/components/DogListings.tsx` — current search/filter/results/card/fallback/API behavior to preserve.
- `src/components/test-landing/PlayfulFeaturedDogs.tsx` — closest existing Playful dog-card and filter treatment.
- `src/components/playful/PlayfulSiteNav.astro`, `src/components/playful/PlayfulSiteFooter.astro`, and `src/components/playful/PlayfulScrollReveal.astro` — shared Playful chrome and dynamic reveal patterns.
- `src/i18n/pt.ts` and `src/i18n/en.ts` — dog-listing labels, status labels, and dog-profile labels used by cards.
- Live `/caes` screenshots captured to `caes-current-desktop.png` and `caes-current-mobile.png` — confirmed current hero is visually weak, current filters/results/cards are functional, and the listing is a very long 99-card page.
- `https://api.capapvl.org/dogs?includeAdopted=true` — returned 99 dogs with 9 adopted records during planning.

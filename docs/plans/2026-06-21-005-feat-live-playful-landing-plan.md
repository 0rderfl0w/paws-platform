---
title: "feat: Promote Playful Impact landing to live homepage"
type: feat
date: 2026-06-21
---

# feat: Promote Playful Impact landing to live homepage

## Summary

Promote the existing Playful Impact `/test-landing/` experience to the canonical live homepage while keeping the review route as a noindex reference. The live Portuguese and English home routes should use the Playful landing composition, canonical metadata, real dog data, and existing production deployment flow.

---

## Problem Frame

`/test-landing/` has been reviewed as the stronger CAPA landing direction: cream canvas, poster-like typography, tactile dog-rescue sections, real photography, and Playful featured dogs backed by the Hetzner API plus committed fallback. The current live `/` and `/en/` routes still use the older warm-earth component stack, so the approved landing system is not yet the public first impression.

---

## Requirements

**Live route promotion**

- R1. Replace the live Portuguese `/` homepage with the Playful Impact landing composition currently represented by `/test-landing/`.
- R2. Keep `/test-landing/` available as a noindex review/reference route unless implementation discovers a routing conflict.
- R3. Preserve the live homepage content flow: hero, stats, why adopt, featured dogs, about/trust, help CTA, and footer.
- R4. Use canonical live metadata for `/` and `/en/`; do not ship `noindex` or test-route titles on live home routes.

**Bilingual and navigation parity**

- R5. Apply the same Playful landing shell to `/en/` using existing English translations so the language switch does not bounce from a redesigned PT home to an old EN home.
- R6. Ensure homepage nav, footer brand links, language switch links, CTAs, and section anchors resolve correctly from `/`, `/en/`, and `/test-landing/`.

**Behavior and data preservation**

- R7. Keep featured dogs backed by the existing Hetzner API plus committed fallback data, with size filters, profile links, real dog photos, and adopted overlays intact.
- R8. Keep Playful scroll-reveal behavior route-scoped, dynamic enough for hydrated dog cards, and respectful of reduced-motion preferences.

**Verification and shipping**

- R9. Add or update static verification so built `/`, `/en/`, and `/test-landing/` HTML catch canonical metadata, Playful shell markers, and critical copy/link regressions.
- R10. Build, browser/screenshot QA, deploy to the Hetzner nginx static root named in `AGENTS.md`, verify live `https://capapvl.org/` and `https://capapvl.org/en/`, update the changelog, commit, push, and fast-forward `main`.

---

## Key Technical Decisions

- **Extract a reusable Playful landing page assembly:** Put the shared Playful composition behind a route-parameterized Astro component so `/`, `/en/`, and `/test-landing/` render the same section order without copy-pasting the page body.
- **Keep the test route as noindex:** The review route remains useful for regression comparison and should not become canonical search content.
- **Promote both language home routes:** Updating `/en/` alongside `/` avoids a jarring language-switch downgrade and uses translation support already present in the Playful components.
- **Make route links explicit:** The current test nav/footer hardcode `/test-landing`; promotion requires `homePath`/route-aware inputs so live brand links, active locale links, and footer links target the correct home route.
- **Preserve React island behavior:** Featured dogs stay as a React island using the existing API/fallback pattern; this is a presentation promotion, not a data-layer rewrite.

---

## Implementation Units

### U1. Extract the shared Playful landing assembly

- **Goal:** Reuse the Playful landing section stack across live and test routes.
- **Requirements:** R1, R2, R3, R5, R8
- **Dependencies:** none
- **Files:**
  - `src/components/test-landing/PlayfulLandingPage.astro`
  - `src/pages/test-landing.astro`
- **Approach:** Move the outer Playful canvas, section ordering, `PlayfulFeaturedDogs` island, footer, and `PlayfulScrollReveal` invocation into a shared assembly component. Keep `/test-landing/` as a thin route wrapper with `noindex` metadata and a `/test-landing` home path.
- **Patterns to follow:** `src/pages/test-landing.astro`, `src/components/playful/PlayfulScrollReveal.astro`
- **Test scenarios:**
  - Verify built `/test-landing/` still includes the Playful shell marker and noindex robots meta.
  - Verify `/test-landing/` still includes hero, stats, featured dogs, about, help CTA, footer, and IBAN content.
- **Verification:** The route body is shared through the new assembly, and the review route keeps the same user-visible content and noindex behavior.

### U2. Promote Playful landing to live PT and EN home routes

- **Goal:** Replace the old live homepage stack with the Playful landing assembly.
- **Requirements:** R1, R3, R4, R5
- **Dependencies:** U1
- **Files:**
  - `src/pages/index.astro`
  - `src/pages/en/index.astro`
- **Approach:** Swap the legacy `Nav`, `Hero`, `Stats`, `WhyAdopt`, `FeaturedDogs`, `AboutBlurb`, `HelpCta`, and `Footer` stack for `PlayfulLandingPage` while keeping live titles, descriptions, locale values, canonical `ogUrl`, and `playfulFonts` enabled. Remove `noindex` from live home routes.
- **Patterns to follow:** `src/pages/test-landing.astro`, current `src/pages/index.astro`, current `src/pages/en/index.astro`
- **Test scenarios:**
  - Verify built `/` includes the Playful shell marker and not the test-title/noindex metadata.
  - Verify built `/en/` includes the Playful shell marker, English landing copy, and not noindex.
  - Verify both routes still include links to dogs, adoption, about, help, and dog profiles through the featured-dogs island.
- **Verification:** Build output for `dist/index.html` and `dist/en/index.html` shows Playful routes with canonical live metadata.

### U3. Make Playful home links route-aware

- **Goal:** Ensure nav/footer links and language switching work from live and test home routes.
- **Requirements:** R2, R4, R5, R6
- **Dependencies:** U1, U2
- **Files:**
  - `src/components/test-landing/PlayfulNav.astro`
  - `src/components/test-landing/PlayfulFooter.astro`
  - `src/components/test-landing/PlayfulLandingPage.astro`
- **Approach:** Add `homePath` and related route props to the test-landing nav/footer components, defaulting to `/test-landing` for review route compatibility. Pass `/` for PT live home and `/en/` for EN live home. Keep section anchor links inside the landing page, and keep cross-route CTAs pointed at `/caes`, `/adocao`, `/sobre-nos`, `/ajudar` or their English counterparts.
- **Patterns to follow:** Route-aware logic in `src/components/playful/PlayfulSiteNav.astro` and `src/components/playful/PlayfulSiteFooter.astro`
- **Test scenarios:**
  - Verify logo/home links on `/` point to `/`, on `/en/` point to `/en/`, and on `/test-landing/` point to `/test-landing`.
  - Verify the PT/EN language switch from `/` maps to `/en/`, from `/en/` maps to `/`, and from `/test-landing/` maps away from the noindex review route only when changing language.
  - Verify mobile menu links close after tap and do not create duplicate element IDs when rendered once per route.
- **Verification:** Static HTML checks and browser QA confirm link targets and menu behavior.

### U4. Add live-home verification coverage

- **Goal:** Catch route-promotion regressions before deploy.
- **Requirements:** R4, R6, R7, R8, R9
- **Dependencies:** U1, U2, U3
- **Files:**
  - `scripts/verify-live-landing-content.mjs`
- **Approach:** Add a build-output smoke that checks `/`, `/en/`, and `/test-landing/` for Playful shell markers, correct robots behavior, canonical URLs, critical translated copy, IBAN/footer content, and absence of legacy/test-only metadata where inappropriate. Keep the verifier focused on static output; use browser QA for hydrated dog cards and visual checks.
- **Patterns to follow:** `scripts/verify-caes-content.mjs`, `scripts/verify-ajudar-content.mjs`, `scripts/verify-about-content.mjs`
- **Test scenarios:**
  - Verify live PT home has Playful shell marker, canonical live title/URL, and no robots noindex.
  - Verify live EN home has Playful shell marker, canonical live title/URL, and no robots noindex.
  - Verify test landing has Playful shell marker and robots noindex.
  - Verify critical donation/contact text and main route links remain present.
- **Verification:** The new verifier passes against `dist/` after a production build.

### U5. Build, visually QA, deploy, document, and push

- **Goal:** Ship the live landing promotion with proof from build, browser, screenshots, and live smokes.
- **Requirements:** R9, R10
- **Dependencies:** U1, U2, U3, U4
- **Files:**
  - `CHANGELOG.md`
- **Approach:** Run the production build with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh `CAPA_ASSET_VERSION`, run all relevant content smokes, preview locally, capture desktop/mobile screenshots for `/` and `/en/`, fix any blocking visual regressions, deploy `dist/` to the Hetzner nginx root, verify live HTTP/API responses and screenshots, update `CHANGELOG.md`, commit, push the feature branch, fast-forward `main`, and push `main`.
- **Patterns to follow:** Deployment flow in `AGENTS.md`; prior Playful route changelog entries in `CHANGELOG.md`
- **Test scenarios:**
  - Verify local preview `/`, `/en/`, and `/test-landing/` return 200.
  - Verify screenshots show no horizontal overflow, clipped hero text, broken images, or missing sections on desktop and mobile.
  - Verify live `https://capapvl.org/`, `/en/`, and `/test-landing/` return 200 after deployment.
  - Verify `https://api.capapvl.org/health` remains `{"ok":true}`.
- **Verification:** Real command output, screenshot paths, live HTTP checks, commit hash, and clean git status are available before final report.

---

## Scope Boundaries

- Do not rewrite homepage copy strategy beyond route metadata and existing PT/EN translations.
- Do not remove `/test-landing/` unless implementation exposes a real production conflict.
- Do not refactor unrelated `/caes` findings from the async review inside this landing promotion; those remain separate follow-up work.
- Do not reintroduce Supabase runtime dependencies or change the dog API/fallback contract.

### Deferred to Follow-Up Work

- Consolidate duplicated dog-card helper logic between `PlayfulFeaturedDogs` and the newer full-listing dog card components.
- Move remaining ad hoc footer aria labels into i18n if the shared Playful footer continues to expand.
- Add responsive dog-card image variants or thumbnails to reduce image payload across listing surfaces.

---

## Risks & Dependencies

- **Search metadata regression:** Promoting a noindex test page could accidentally hide the live homepage. Mitigate with static checks for robots tags and canonical OG URLs.
- **Route-link drift:** Components hardcoded for `/test-landing` can leave live logo/footer/language links pointing at the review route. Mitigate with explicit `homePath` props and static link checks.
- **Hydration/data drift:** Featured dogs depend on the same React/API/fallback path as before. Mitigate with production API build env and browser QA.
- **Immutable Astro assets:** Live nginx caches `/_astro/*` immutably. Mitigate by using a fresh `CAPA_ASSET_VERSION` for the production build.

---

## Sources / Research

- Existing live PT home route: `src/pages/index.astro`
- Existing live EN home route: `src/pages/en/index.astro`
- Existing test landing route: `src/pages/test-landing.astro`
- Playful landing components: `src/components/test-landing/*`
- Shared route-aware Playful shell patterns: `src/components/playful/PlayfulSiteNav.astro`, `src/components/playful/PlayfulSiteFooter.astro`
- Route mapping and translations: `src/i18n/index.ts`, `src/i18n/pt.ts`, `src/i18n/en.ts`
- Design reference: `DESIGN.md`
- Deployment and verification constraints: `AGENTS.md`

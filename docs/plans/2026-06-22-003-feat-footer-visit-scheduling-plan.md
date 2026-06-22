---
title: "feat: Add footer visit scheduling"
type: "feat"
date: "2026-06-22"
---

# feat: Add footer visit scheduling

## Summary

Add a localized footer Visit section with a Google Maps map/pin CTA and a schedule-first prompt, reuse the existing visit-request form from dog profiles, and fix the mobile popup so it is not clipped by the sticky nav.

---

## Problem Frame

Visitors need a clear way to find CAPA and schedule a visit from the footer. The current footer places the address under Contact, while the visit form is dog-profile-local and currently renders beneath the sticky nav on narrow mobile screens.

---

## Requirements

**Footer visit UX**
- R1. The Playful footer exposes a third content section named Visit / Visita immediately after Navigation in source order, so it appears under Navigation on mobile.
- R2. The Visit section includes a map/pin-style Google Maps link that opens the CAPA location in a new tab.
- R3. The Contact section no longer repeats the physical address and keeps only phone and email.
- R4. Visit copy tells users to schedule first so CAPA volunteers can welcome them instead of arriving during cleaning, feeding, or shelter work.

**Visit form reuse**
- R5. The footer schedule button opens the same visit-request form pattern used on dog profile pages.
- R6. Dog-profile visit requests still include the dog name; footer-origin visit requests identify the request as a general shelter visit.
- R7. The popup composes an email to `capa.geralpvl@gmail.com` with visitor name, email, phone, preferred date/time, message, context, and page URL.

**Mobile modal fix**
- R8. The schedule modal overlays above the sticky nav on mobile and keeps its top, close button, title, and first fields visible or scrollable within the viewport.

---

## Key Technical Decisions

- **Extract the visit form into a React island:** Move `VisitScheduleCta` out of `DogProfile.tsx` into a reusable React component so footer and dog profiles share one form implementation and mailto builder.
- **Use a portal for the modal layer:** Render the modal into `document.body` from the reusable component so ancestor stacking contexts and sticky nav z-index cannot clip the popup.
- **Keep footer location static:** The footer can render a static maps card in Astro while hydrating only the schedule button/form island, minimizing React work on static pages.
- **Preserve bilingual translation shape:** Add PT/EN footer visit copy and generic visit-request labels through the existing `src/i18n` objects so both live and test footers remain locale-safe.

---

## Implementation Units

### U1. Extract reusable visit scheduling island

- **Goal:** Reuse one visit scheduling component across dog profiles and the footer.
- **Requirements:** R5, R6, R7, R8.
- **Dependencies:** None.
- **Files:**
  - `src/components/DogProfile.tsx`
  - `src/components/VisitSchedule.tsx`
  - `src/i18n/pt.ts`
  - `src/i18n/en.ts`
  - `scripts/verify-dog-profile-browser.mjs`
- **Approach:** Move the current dog-profile schedule form into `VisitSchedule.tsx`, keep dog-name behavior via optional props, add a footer/general-visit mode, and portal the modal to `document.body` with viewport-safe padding and an internal scroll container.
- **Patterns to follow:** Existing mailto fallback behavior in `DogProfile.tsx`; existing sponsor/MB Way modal verification patterns in browser smoke scripts.
- **Test scenarios:**
  - Dog-profile PT and EN buttons open the form and generate a mailto containing the dog name and filled QA visitor fields.
  - Adopted dog profiles do not show the schedule button.
  - Mobile dog-profile modal opens above the sticky nav; the modal top and close control are inside the viewport.
  - Footer/general mode generates a mailto with the general shelter visit context instead of a dog name.
- **Verification:** `bun run build`; dog-profile browser verifier passes locally and live.

### U2. Add footer Visit section and remove redundant address from Contact

- **Goal:** Add a Visit section under Navigation, provide maps access, and keep Contact to direct communication methods.
- **Requirements:** R1, R2, R3, R4, R5.
- **Dependencies:** U1.
- **Files:**
  - `src/components/playful/PlayfulSiteFooter.astro`
  - `src/components/test-landing/PlayfulFooter.astro`
  - `src/i18n/pt.ts`
  - `src/i18n/en.ts`
  - `scripts/verify-live-landing-content.mjs`
  - `scripts/verify-live-landing-browser.mjs`
- **Approach:** Insert the Visit section after Navigation in both footer variants, render a compact map/pin card linked to the existing Google Maps URL, remove the address list item from Contact, and mount the reusable visit form button inside the Visit section.
- **Patterns to follow:** Existing Playful footer grid, maps URL constants, `data-footer-iban` smoke-test markers, and locale-aware path/copy setup.
- **Test scenarios:**
  - PT and EN footer DOM includes Visit/Visita section immediately after Navigation source order.
  - Maps card link opens the existing Google Maps URL with safe new-tab attributes.
  - Contact section includes phone and email but no address text.
  - Footer schedule form opens, submits in skip-launch test mode, and generates a mailto to the shelter email.
  - Mobile footer has no horizontal overflow at 390px and 320px.
- **Verification:** Static content smoke and live landing browser verifier pass locally and live.

### U3. Deploy and visual QA

- **Goal:** Ship the footer visit section and modal fix to production with visual evidence.
- **Requirements:** R1-R8.
- **Dependencies:** U1, U2.
- **Files:**
  - `CHANGELOG.md`
- **Approach:** Record the feature in the changelog, build with a fresh `CAPA_ASSET_VERSION`, sync `dist/` to `/home/deploy/apps/capapvl`, restore directory/file permissions, and verify live PT/EN pages.
- **Patterns to follow:** Deploy workflow in `AGENTS.md` and prior CAPA verification commits.
- **Test scenarios:**
  - Live homepage/footer returns 200 and includes the Visit section.
  - Live dog-profile modal screenshot confirms top is no longer clipped by nav.
  - Live footer screenshot confirms map/pin, schedule-first copy, and button placement.
- **Verification:** Live browser checks, screenshots, and production permission check all pass.

---

## Scope Boundaries

- This plan does not add a backend form endpoint; CAPA remains static-site compatible and uses prepared `mailto:` submissions.
- This plan does not change the Google Maps destination; it reuses the existing CAPA maps URL.
- This plan does not add scheduling availability logic or calendar integration.

---

## Risks & Dependencies

- **Portal hydration risk:** React portal code must guard against SSR/document access during Astro build.
- **Footer hydration cost:** The footer schedule island should hydrate lazily enough to avoid making every page feel heavier.
- **Stacking-context regression:** Browser verification must assert the modal top is not hidden behind sticky nav on small mobile.

---

## Sources & Research

- `src/components/DogProfile.tsx` contains the current schedule form and the mobile clipping source.
- `src/components/playful/PlayfulSiteFooter.astro` and `src/components/test-landing/PlayfulFooter.astro` contain the current address, maps URL, and footer layout.
- `scripts/verify-dog-profile-browser.mjs` already exercises dog-profile visit form mailto behavior.
- `scripts/verify-live-landing-browser.mjs` and `scripts/verify-live-landing-content.mjs` already exercise footer and mobile landing behavior.

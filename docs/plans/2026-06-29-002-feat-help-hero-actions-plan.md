---
title: "feat: Update help hero actions"
type: feat
date: 2026-06-29
---

# feat: Update help hero actions

## Summary

Update the CAPA help hero buttons so visitors have two clearer first actions: open the volunteer scheduling page, or open a donation-method dropdown matching the existing Donate menu. Apply the behavior to both Portuguese and English help pages, preserve the current playful hero composition, then build, QA, deploy, and verify live.

---

## Problem Frame

The current help hero uses a generic email CTA and an in-page “see how to help” anchor. Now that the volunteer form exists and the Donate menu already explains payment options, the hero should route visitors directly into those two high-intent paths.

---

## Requirements

- R1. The Portuguese help hero primary action opens the volunteer scheduling page at `/ajudar/formulario-voluntariado`.
- R2. The English help hero primary action opens the volunteer scheduling page at `/en/help/volunteer-form`.
- R3. The Portuguese and English help hero secondary action is a Donate dropdown with the same donation choices as the site menu: PayPal, MB Way, and bank transfer.
- R4. The change preserves the current hero visual rhythm: two pill buttons under the hero copy, no decorative element blocking text, and no horizontal overflow on mobile.
- R5. Existing Donate menu behavior remains unchanged in the navigation and donation cards.
- R6. The deployment includes the already-built volunteer form/API support currently in the working tree, because the hero links depend on that route and backend.

---

## Key Technical Decisions

- **Reuse the existing donation menu component:** `PlayfulDonateMenu.astro` already owns PayPal, MB Way modal, bank-transfer anchor behavior, accessibility attributes, and backend/fallback submission logic. Extending its presentation hooks is lower risk than building a second dropdown.
- **Localize labels by page locale:** Portuguese uses `Voluntariado` / `Doar`; English uses `Volunteer` / `Donate`, while both routes point to their localized volunteer form page.
- **Keep the hero as static Astro:** No new React island is needed; the Donate menu already ships its minimal Astro script and the Volunteer action is a plain link.
- **Deploy current feature tree together:** The hero CTA depends on the volunteer form routes and API `volunteer` form kind, so static and API deploy verification must include both the previous volunteer-form work and this hero-button change.

---

## Implementation Units

### U1. Add hero-friendly donation menu presentation hooks

- **Goal:** Let the shared Donate menu render as a hero pill while preserving existing nav/card behavior.
- **Requirements:** R3, R4, R5
- **Dependencies:** none
- **Files:**
  - `src/components/playful/PlayfulDonateMenu.astro`
- **Approach:** Add optional class hooks for the root and menu button, and use the existing `buttonLabel` for menu mode as well as MB Way button mode. Default values must match current nav behavior so existing callers do not change.
- **Patterns to follow:** Existing `variant`, `mode`, `cardClass`, and `buttonLabel` props in `PlayfulDonateMenu.astro`.
- **Test scenarios:**
  - Existing nav Donate menu still renders the default label and opens PayPal, MB Way, and bank-transfer items.
  - A hero caller can render the menu as an outlined pill without changing dropdown items.
  - MB Way modal still opens from the dropdown and remains connected to `/forms/submit`.
- **Verification:** Browser QA opens the hero dropdown and sees the three expected donation options; build succeeds.

### U2. Replace Portuguese help hero CTAs

- **Goal:** Change the Portuguese hero from generic contact/help anchors to Volunteer page + Donate dropdown.
- **Requirements:** R1, R3, R4, R6
- **Dependencies:** U1
- **Files:**
  - `src/components/ajudar/AjudarPlayfulHero.astro`
- **Approach:** Import `PlayfulDonateMenu`, point the primary action at `/ajudar/formulario-voluntariado`, and render the secondary action as a hero-styled `PlayfulDonateMenu` instance.
- **Patterns to follow:** Current hero button classes and nav Donate dropdown behavior.
- **Test scenarios:**
  - `/ajudar/` hero contains a link to `/ajudar/formulario-voluntariado`.
  - The hero Donate button opens a dropdown with PayPal, MB Way, and transferência bancária.
  - Desktop and mobile screenshots show the buttons are readable and not clipped.
- **Verification:** Browser QA and screenshot inspection pass for the Portuguese help hero.

### U3. Replace English help hero CTAs

- **Goal:** Mirror the hero CTA behavior on the English help page.
- **Requirements:** R2, R3, R4, R6
- **Dependencies:** U1
- **Files:**
  - `src/pages/en/help.astro`
- **Approach:** Point the primary action at `/en/help/volunteer-form` and render an English hero-styled `PlayfulDonateMenu` instance for Donate.
- **Patterns to follow:** Portuguese hero after U2 and existing English help hero structure.
- **Test scenarios:**
  - `/en/help/` hero contains a link to `/en/help/volunteer-form`.
  - The hero Donate button opens a dropdown with PayPal, MB Way, and bank transfer.
  - Desktop and mobile screenshots show no overflow or clipped dropdown.
- **Verification:** Browser QA and screenshot inspection pass for the English help hero.

### U4. Build, deploy, and live verify

- **Goal:** Ship the hero CTA update plus the volunteer-form/API dependency to Hetzner.
- **Requirements:** R1 through R6
- **Dependencies:** U1, U2, U3
- **Files:**
  - `CHANGELOG.md`
  - `dist/`
  - `/home/deploy/apps/capapvl` deploy target
  - `server/capa-api.ts`
- **Approach:** Record the change, build with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh asset version, run local endpoint/browser checks, rsync `dist/` to the nginx static root with public-read permissions, restart the Bun API service for backend form-kind support, and verify live static routes plus form endpoint behavior.
- **Patterns to follow:** CAPA deploy instructions in `AGENTS.md` and the static-site deployment permission rule.
- **Test scenarios:**
  - `bun run build` succeeds.
  - Local browser QA validates help hero links/dropdowns and volunteer form routes.
  - Live `/ajudar/` and `/en/help/` show the new hero actions.
  - Live `/ajudar/formulario-voluntariado` and `/en/help/volunteer-form` return HTTP 200.
  - Live API accepts volunteer dry-run verification.
- **Verification:** Live `curl` and browser checks prove the deployed URLs, hero dropdowns, and form flow work.

---

## Scope Boundaries

- Do not redesign the hero beyond the requested button behavior.
- Do not change donation methods, PayPal URL, MB Way modal copy, or bank-transfer content.
- Do not add a scheduling calendar or availability-slot system.
- Do not change nav Donate behavior except through backwards-compatible component props.

---

## Risks & Dependencies

- The working tree already contains the volunteer-form/API feature; deploying the hero without the API restart would expose a route that can render but whose backend submission kind may be rejected by the old live service.
- `AGENTS.md` has a pre-existing uncommitted guidance edit; it should not affect the static build or deployment artifact.
- The Donate dropdown panel must stay within the viewport when used in the hero, especially on the screenshot's desktop width and on mobile.

---

## Sources / Research

- User screenshot of the current Portuguese help hero shows the existing two-button layout to preserve.
- `src/components/ajudar/AjudarPlayfulHero.astro` owns the Portuguese hero.
- `src/pages/en/help.astro` owns the English hero.
- `src/components/playful/PlayfulDonateMenu.astro` owns the shared Donate dropdown and MB Way modal behavior.
- `AGENTS.md` documents CAPA's Astro/React/Tailwind stack and Hetzner static/API deploy workflow.

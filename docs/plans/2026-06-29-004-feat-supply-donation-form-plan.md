---
title: "feat: Add supply donation form"
type: feat
date: 2026-06-29
---

# feat: Add supply donation form

## Summary

Add a dedicated in-kind donation form for people who want to donate supplies, then replace the visible shelter email under the “Donativos em Espécie” / “In-Kind Donations” section with a button to that form. The form should reuse CAPA’s existing backend-backed form submission flow and email CAPA like the other public forms.

## Problem Frame

The in-kind donation section currently ends with a public email address. That is the wrong interaction pattern now that CAPA has backend-backed forms: supply donors should be able to arrange a drop-off through a focused form instead of copying an email address or being sent to the volunteer form.

## Requirements

**Public routes**

- R1. The Portuguese supply donation form is reachable from `/ajudar/` through a localized route.
- R2. The English supply donation form is reachable from `/en/help/` through a localized route.
- R3. The in-kind donation section replaces the public email text with a button linking to the supply donation form on both locales.

**Form behavior**

- R4. The form collects required name, required email, optional phone, preferred drop-off time, one or more supply categories, and a free-text details field.
- R5. The form uses CAPA’s European `dd/mm/yyyy hh:mm` 24-hour time input pattern.
- R6. Successful backend submissions show an on-page success state without opening a mail client.
- R7. Backend or email failure leaves a prepared `mailto:` fallback to `capa.geralpvl@gmail.com`.

**Backend and delivery**

- R8. Supply donation submissions post to `/forms/submit`, persist in `form_submissions`, and attempt SMTP email using the existing form delivery environment.
- R9. Email bodies identify the request as an in-kind supply donation and include selected supply categories, preferred drop-off time, email, optional phone, details, page URL, source, and locale.

## Key Technical Decisions

- **Use a separate form kind:** `supply_donation` makes shelter emails and stored submissions distinguish supplies from volunteer scheduling.
- **Store selected supply categories in payload:** `form_submissions.payload` can preserve the structured categories without adding a database column.
- **Build a separate React island:** Supply donation copy, categories, validation, and fallback email differ enough from volunteer scheduling to avoid overloading `VolunteerForm.tsx`.
- **Use localized help subroutes:** Portuguese uses a localized route under `/ajudar/`; English uses a nested route under `/en/help/`.

## Acceptance Examples

- AE1. Given a Portuguese visitor is reading “Donativos em Espécie”, when they click the drop-off button, then they reach the Portuguese supply donation form.
- AE2. Given an English visitor is reading “In-Kind Donations”, when they click the drop-off button, then they reach the English supply donation form.
- AE3. Given a visitor submits name, email, preferred drop-off time, and at least one supply category with no phone number, when the backend returns `emailSent:true`, then the page shows success and the payload includes an empty phone value.
- AE4. Given the backend is unavailable, when a visitor submits valid supply donation details, then the page shows a prepared email fallback to CAPA.

## Implementation Units

### U1. Extend public form submission contract

- **Goal:** Add `supply_donation` support to the shared frontend/backend submission contract.
- **Requirements:** R4, R8, R9, AE3
- **Dependencies:** none
- **Files:**
  - `src/lib/formSubmission.ts`
  - `server/capa-api.ts`
  - `scripts/verify-form-endpoint.mjs`
- **Approach:** Extend form kind validation, normalize supply categories from array/string input, require at least one category and preferred time for supply donations, include categories in stored payload and email body, and add dry-run verifier coverage.
- **Patterns to follow:** Existing `volunteer` validation, `cleanWorkTypes`, and `scripts/verify-form-endpoint.mjs` dry-run assertions.
- **Test scenarios:**
  - Valid supply donation payload with no phone returns HTTP 201 in dry-run and includes `emailSent:true`.
  - Supply donation payload with no selected supply categories returns HTTP 400.
  - Existing volunteer, visit, MB Way, and honeypot verifier cases still pass.
- **Verification:** Endpoint verifier passes locally and after live deployment.

### U2. Add bilingual supply donation form routes

- **Goal:** Create static Astro routes that render a localized supply donation form island.
- **Requirements:** R1, R2, R4, R5, R6, R7, AE3, AE4
- **Dependencies:** U1
- **Files:**
  - `src/components/SupplyDonationForm.tsx`
  - `src/pages/ajudar/formulario-donativos-em-especie.astro`
  - `src/pages/en/help/supply-donation-form.astro`
  - `src/i18n/index.ts`
  - `src/components/playful/PlayfulSiteNav.astro`
- **Approach:** Mirror the volunteer form’s submission state, honeypot, European time formatting, QA skip hooks, and localized page framing while using supply-specific categories and copy.
- **Patterns to follow:** `src/components/VolunteerForm.tsx`, `src/pages/ajudar/formulario-voluntariado.astro`, and `src/pages/en/help/volunteer-form.astro`.
- **Test scenarios:**
  - Portuguese route renders localized supply donation copy, required email, optional phone, preferred drop-off time, and multi-select supply category checkboxes.
  - English route renders equivalent copy and fields.
  - Mocked successful backend submission shows success and captures selected categories.
  - `data-skip-backend="true"` shows the prepared mailto fallback without launching email in QA.
- **Verification:** Build output contains both routes and browser QA submits both forms without console errors or horizontal overflow.

### U3. Replace in-kind donation email text with form buttons

- **Goal:** Remove the visible shelter email from the supply donation section and route donors to the new form.
- **Requirements:** R3, AE1, AE2
- **Dependencies:** U2
- **Files:**
  - `src/components/ajudar/AjudarDonationNeeds.astro`
  - `src/pages/en/help.astro`
  - `scripts/verify-volunteer-form-browser.mjs`
- **Approach:** Replace the rounded email sentence under the supply cards with a playful button and short helper text. Extend browser QA to assert the PT/EN supply sections link to the new routes and no longer render the email in that section.
- **Patterns to follow:** Existing Playful CTA button styling and `checkHelpLink` style browser assertions.
- **Test scenarios:**
  - `/ajudar/` in-kind section contains a button to `/ajudar/formulario-donativos-em-especie`.
  - `/en/help/` in-kind section contains a button to `/en/help/supply-donation-form`.
  - The in-kind section no longer exposes `capa.geralpvl@gmail.com` as visible text.
  - Desktop and mobile screenshots show the button is readable and not clipped.
- **Verification:** Browser QA and screenshot inspection pass for the updated in-kind sections.

### U4. Build, deploy, and live verify

- **Goal:** Ship the supply donation form and CTA update to Hetzner.
- **Requirements:** R1 through R9
- **Dependencies:** U1, U2, U3
- **Files:**
  - `CHANGELOG.md`
  - `AGENTS.md`
  - `dist/`
  - `/home/deploy/apps/capapvl` deploy target
  - `server/capa-api.ts`
- **Approach:** Record the change, build with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh asset version, run endpoint/browser checks, rsync `dist/` to the nginx static root with public-read permissions, restart the Bun API service, and verify live routes plus form endpoint behavior.
- **Patterns to follow:** CAPA deploy instructions in `AGENTS.md` and static-site deployment permission rules.
- **Test scenarios:**
  - `bun run build` succeeds.
  - Endpoint verifier passes locally.
  - Browser QA validates supply form routes, supply section buttons, existing volunteer routes, and Donate dropdown regressions.
  - Live supply form routes return HTTP 200 and include supply form markers.
  - Live API recognizes `kind: supply_donation` validation.
- **Verification:** Live `curl` and browser checks prove the deployed URLs, section buttons, and form flow work.

## Scope Boundaries

- Do not change the financial donation section or payment method behavior.
- Do not replace foster-family or final-contact mailto CTAs in this change.
- Do not add inventory tracking, pickup logistics, calendars, or staff-side workflow automation.
- Do not create a database migration unless implementation shows `payload` is insufficient for email and recovery.

## Risks & Dependencies

- The live API must be restarted after backend code changes; otherwise the static form will post a `supply_donation` kind that the current service rejects.
- The existing page still has other legitimate `mailto:` links outside the in-kind supply section, so QA should scope email-removal assertions to the supply donation section.

## Sources / Research

- `src/components/ajudar/AjudarDonationNeeds.astro` owns the Portuguese in-kind donation section shown in the screenshot.
- `src/pages/en/help.astro` owns the English in-kind donation section.
- `src/components/VolunteerForm.tsx` provides the existing localized React form pattern.
- `server/capa-api.ts` provides form validation, persistence, SMTP delivery, and CORS behavior.
- `AGENTS.md` documents CAPA’s Hetzner static/API deploy and form delivery workflow.

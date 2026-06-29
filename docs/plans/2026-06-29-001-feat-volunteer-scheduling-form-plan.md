---
title: "feat: Add volunteer scheduling form"
type: feat
date: 2026-06-29
---

# feat: Add volunteer scheduling form

## Summary

Add a bilingual volunteer scheduling form to the CAPA help surface so English visitors can use `/en/help/volunteer-form` and Portuguese visitors can use the equivalent help-page form route. The form should reuse CAPA's existing backend-backed form submission flow so shelter staff receive the same email delivery and stored submission behavior as the existing visit, sponsorship, MB Way, and adoption-interest forms.

---

## Problem Frame

The help pages currently describe volunteering but only push visitors toward generic email contact. CAPA needs a direct scheduling form that captures what kind of volunteer work someone is willing to do, their preferred time, and required email contact while keeping phone optional.

---

## Requirements

**Public routes**

- R1. The English volunteer form is reachable at `/en/help/volunteer-form`.
- R2. The Portuguese volunteer form is reachable from the Portuguese help page through a localized route.
- R3. Both `/en/help/` and `/ajudar/` include a clear hyperlink/CTA to the volunteer form.

**Form behavior**

- R4. The form collects a required email address, an optional phone number, a preferred volunteer time, and multi-select checkbox work types.
- R5. The form uses CAPA's controlled European `dd/mm/yyyy hh:mm` 24-hour time input pattern instead of native browser `datetime-local`.
- R6. Successful submissions show an on-page success state without launching a mail client.
- R7. Backend or email failure leaves a prepared `mailto:` fallback to `capa.geralpvl@gmail.com`.

**Backend and delivery**

- R8. Volunteer submissions post to `/forms/submit`, persist in `form_submissions`, and attempt SMTP email to CAPA using the existing form delivery environment.
- R9. Email bodies include the selected volunteer work types, preferred time, email, optional phone, message, page URL, source, and locale.

---

## Key Technical Decisions

- **Extend the existing form endpoint instead of adding a new endpoint:** `/forms/submit` already handles validation, persistence, email delivery, CORS, honeypot protection, and fallback behavior.
- **Store work types in payload and email rather than migrating the database:** `form_submissions.payload` can preserve the structured selection while avoiding a schema change for a single form-specific field.
- **Build the form as a React island on static Astro pages:** The form needs validation, submit state, fallback generation, and checkbox state, while the routes remain static for nginx hosting.
- **Use localized nested help routes:** `/en/help/volunteer-form` matches the requested URL shape, and `/ajudar/formulario-voluntariado` keeps the Portuguese surface consistent with existing localized routes.

---

## Acceptance Examples

- AE1. Given an English visitor opens `/en/help/`, when they click the volunteer CTA, then they reach `/en/help/volunteer-form`.
- AE2. Given a Portuguese visitor opens `/ajudar/`, when they click the volunteer CTA, then they reach `/ajudar/formulario-voluntariado`.
- AE3. Given a visitor submits name, email, preferred time, and at least one work type with no phone number, when the backend returns `emailSent:true`, then the page shows success and the payload includes an empty phone value.
- AE4. Given the backend is unavailable, when a visitor submits valid details, then the page shows the prepared email fallback to CAPA.

---

## Implementation Units

### U1. Extend public form submission contract

- **Goal:** Add a `volunteer` form kind and work-type field to the shared frontend/backend submission contract.
- **Requirements:** R4, R8, R9, AE3
- **Dependencies:** none
- **Files:**
  - `src/lib/formSubmission.ts`
  - `server/capa-api.ts`
  - `scripts/verify-form-endpoint.mjs`
- **Approach:** Extend form kind validation, normalize work types from array/string input, require at least one work type for volunteer submissions, include work types in the stored payload and email body, and add a dry-run verifier case.
- **Patterns to follow:** Existing sponsorship/visit/adoption validation and `scripts/verify-form-endpoint.mjs` dry-run assertions.
- **Test scenarios:**
  - Valid volunteer payload with no phone returns HTTP 201 in dry-run and includes `emailSent:true`.
  - Volunteer payload with no selected work types returns HTTP 400.
  - Existing visit and MB Way verifier cases still pass.
- **Verification:** Endpoint verifier passes locally and against the live API after deploy.

### U2. Add bilingual volunteer form routes

- **Goal:** Create static Astro routes that render a localized React volunteer form island.
- **Requirements:** R1, R2, R4, R5, R6, R7, AE3, AE4
- **Dependencies:** U1
- **Files:**
  - `src/components/VolunteerForm.tsx`
  - `src/pages/en/help/volunteer-form.astro`
  - `src/pages/ajudar/formulario-voluntariado.astro`
  - `src/i18n/index.ts`
  - `src/components/playful/PlayfulSiteNav.astro`
- **Approach:** Reuse Playful nav/footer/layout, mirror CAPA's existing modal/form styling, post through `submitFormSubmission`, keep a honeypot field and QA skip hooks, and update language alternates for the nested routes.
- **Patterns to follow:** `VisitSchedule.tsx` submission state, European time formatting, and Playful help page section/card styling.
- **Test scenarios:**
  - English route renders with expected title, required email, optional phone, preferred time, and multi-select work checkboxes.
  - Portuguese route renders localized copy and equivalent fields.
  - Form submission with `data-skip-backend="true"` shows fallback mailto without launching email in QA.
  - Form submission through a mocked successful backend shows success and captures selected work types.
- **Verification:** Build output contains both nested routes and browser QA can submit both forms without console errors or horizontal overflow.

### U3. Link help pages to the form

- **Goal:** Make the volunteer form discoverable from the existing English and Portuguese help pages.
- **Requirements:** R3, AE1, AE2
- **Dependencies:** U2
- **Files:**
  - `src/components/ajudar/AjudarVolunteerWays.astro`
  - `src/pages/en/help.astro`
- **Approach:** Add a prominent CTA after the volunteer-work cards on both help pages, using Playful button styling and localized copy.
- **Patterns to follow:** Existing rounded Playful CTA buttons and link treatments in help sections.
- **Test scenarios:**
  - `/en/help/` contains a link with href `/en/help/volunteer-form`.
  - `/ajudar/` contains a link with href `/ajudar/formulario-voluntariado`.
- **Verification:** Static HTML grep and browser click checks confirm the links are present and route correctly.

### U4. Build, deploy, and live verify

- **Goal:** Ship the static routes and API update to the Hetzner live surface.
- **Requirements:** R1 through R9
- **Dependencies:** U1, U2, U3
- **Files:**
  - `CHANGELOG.md`
  - `dist/`
  - `/home/deploy/apps/capapvl` deploy target
- **Approach:** Build with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and fresh `CAPA_ASSET_VERSION`, restart `capapvl-api.service` for backend changes, sync `dist/` to nginx root with safe permissions, and verify live routes plus a dry-run/live form endpoint response.
- **Patterns to follow:** Deploy flow in `AGENTS.md` and static-site deployment permission checks.
- **Test scenarios:**
  - `bun run build` succeeds.
  - `scripts/verify-form-endpoint.mjs` passes locally and live.
  - Live `/en/help/volunteer-form` and `/ajudar/formulario-voluntariado` return HTTP 200 and include volunteer form markers.
- **Verification:** Live `curl` and browser checks prove the deployed URLs and form flow work.

---

## Checkout Handoff — 2026-06-29

- Local implementation and QA are complete: `PUBLIC_CAPA_API_URL=https://api.capapvl.org bun run build`, `bun run scripts/verify-form-endpoint.mjs`, and `node scripts/verify-volunteer-form-browser.mjs http://127.0.0.1:4322` all passed.
- Browser QA covered English and Portuguese help CTAs, `/en/help/volunteer-form/`, `/ajudar/formulario-voluntariado/`, language links, optional phone, seven multi-select work checkboxes, European time placeholders, mocked successful backend submission, and `mailto:capa.geralpvl@gmail.com` fallback.
- Remaining before launch: deploy static `dist/`, restart/update `capapvl-api.service` so live `/forms/submit` accepts `kind: volunteer`, then verify the live English and Portuguese URLs plus the live/dry-run form endpoint.

---

## Scope Boundaries

- Do not add scheduling calendars, availability slots, or staff-side workflow automation in this change.
- Do not change the volunteer program copy beyond adding the form CTA and form page content.
- Do not add a database migration unless implementation shows `payload` is insufficient for email and recovery.

---

## Risks & Dependencies

- The live API must be restarted after backend code changes; otherwise the static page will post a `volunteer` kind that the current server rejects.
- SMTP delivery depends on existing `/etc/capapvl-api.env` form settings. If SMTP is unavailable, persistence and mailto fallback remain the required graceful path.
- The repository currently has a pre-existing uncommitted `AGENTS.md` change. Implementation should avoid mixing that edit into feature commits unless explicitly requested.

---

## Sources / Research

- `AGENTS.md` documents CAPA's Astro 5, React 19, Tailwind 4, Hetzner nginx, Bun API, and form delivery workflow.
- `src/components/VisitSchedule.tsx` and `src/lib/formSubmission.ts` provide the current backend-backed public form pattern.
- `server/capa-api.ts` provides form validation, persistence, SMTP delivery, and CORS behavior.
- `src/components/ajudar/AjudarVolunteerWays.astro` and `src/pages/en/help.astro` are the help-page volunteer sections to link from.

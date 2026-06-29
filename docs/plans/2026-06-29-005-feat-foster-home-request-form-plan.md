---
title: "feat: Add foster home request form"
type: feat
date: 2026-06-29
---

# feat: Add foster home request form

## Summary

Add a bilingual, multi-step foster home request form for CAPA's FAT/foster-family program. The form should qualify the home environment, household, animal experience, availability, and fostering preferences before emailing CAPA through the existing backend form pipeline.

---

## Problem Frame

The current foster-family CTA on the help pages is a direct `mailto:` link. CAPA needs a more comprehensive intake flow so the shelter receives structured context about whether a volunteer's home, routine, experience, and availability fit temporary foster care before replying.

---

## Requirements

### Visitor experience

- R1. The foster CTA in the FAT/foster-family section opens a dedicated foster-home form instead of a prepared email.
- R2. The form is available in English and Portuguese with language-switch parity.
- R3. The form is multi-step and asks logical screening questions about contact details, home environment, household, pets, experience, availability, animal preferences, and constraints.
- R4. Visitors can move backward and forward without losing entered values, and the active step is clear on desktop and mobile.
- R5. Required fields are validated before submission; optional notes remain optional.

### Form delivery

- R6. Submissions use the existing `/forms/submit` backend/email flow and send to CAPA's configured shelter recipient.
- R7. The backend recognizes a new `foster_home` kind, persists the submission, and includes the structured foster details in the email body and JSON payload.
- R8. If backend delivery fails or is unavailable, the form shows the existing prepared-email fallback pattern.

### Quality and deployment

- R9. Existing volunteer, supply-donation, adoption-interest, visit, sponsorship, and MB Way form flows keep working.
- R10. Browser verification covers route links, multi-step navigation, required answers, payload shape, fallback behavior, mobile screenshots, and language-switch parity.
- R11. Production deploy verifies the live foster form routes, updated buttons, API health, and no obvious desktop/mobile visual regressions.

---

## Key Technical Decisions

- **Reuse the generic form pipeline:** Add `foster_home` to `server/capa-api.ts` and `src/lib/formSubmission.ts` rather than creating a new endpoint. This preserves storage, SMTP, CORS, honeypot, and fallback behavior.
- **Store structured details in JSONB:** Keep the existing table schema and place detailed foster answers in the `payload` JSONB field, while also composing a readable email body. This avoids a database migration for a questionnaire-specific shape.
- **Build a dedicated React island:** Implement a new `FosterHomeForm.tsx` because multi-step state, step validation, and checkbox/radio grouping need client-side behavior. Static Astro pages should host it like the volunteer and supply forms.
- **Use route parity:** Add `/en/help/foster-home-form` and `/ajudar/formulario-familia-acolhimento`, then extend the shared route map so the nav language switcher stays correct.
- **Keep the questionnaire practical:** Ask enough qualifying questions for CAPA to triage quickly, but avoid collecting sensitive documents, IDs, or intrusive financial information on a public static site.

---

## High-Level Technical Design

```mermaid
flowchart TB
  HelpCTA[Help page foster CTA] --> FormPage[Locale-specific foster form route]
  FormPage --> Stepper[React multi-step form island]
  Stepper --> Validate[Per-step required-field validation]
  Validate --> Payload[Structured foster_home payload]
  Payload --> API[/forms/submit]
  API --> DB[(form_submissions payload JSONB)]
  API --> Email[CAPA email body]
  API -->|failure/unavailable| Mailto[Prepared email fallback]
```

---

## Implementation Units

### U1. Extend the shared form contract for foster-home submissions

- **Goal:** Add backend/frontend support for `foster_home` submissions without changing the database schema.
- **Requirements:** R6, R7, R8, R9.
- **Dependencies:** None.
- **Files:** `server/capa-api.ts`, `src/lib/formSubmission.ts`, `scripts/verify-form-endpoint.mjs`, `AGENTS.md`.
- **Approach:** Add the new kind to the shared kind list, accept structured foster details in payload JSON, validate the minimal required public contract, and add email subject/body rendering for foster requests.
- **Patterns to follow:** `supply_donation` and `volunteer` handling in `server/capa-api.ts`; dry-run coverage in `scripts/verify-form-endpoint.mjs`.
- **Test scenarios:**
  - Happy path: a foster request with contact details and structured answers returns 201 with `emailSent:true` under dry run.
  - Error path: missing required foster details returns 400 with a foster-specific validation message.
  - Regression: existing volunteer and supply-donation dry-run requests still return 201.
  - Honeypot: a request with `website` is still ignored.
- **Verification:** Endpoint verifier reports the new foster happy path and required-field rejection alongside existing form cases.

### U2. Create the bilingual multi-step foster-home form

- **Goal:** Build a polished React form island that gathers comprehensive foster-home context.
- **Requirements:** R2, R3, R4, R5, R8.
- **Dependencies:** U1.
- **Files:** `src/components/FosterHomeForm.tsx`, `src/pages/en/help/foster-home-form.astro`, `src/pages/ajudar/formulario-familia-acolhimento.astro`, `src/i18n/index.ts`.
- **Approach:** Use a stepper with contact, home/household, animals/experience, availability/preferences, and final review/notes. Keep fields bilingual, preserve values between steps, validate required groups before moving forward, and submit via `submitFormSubmission` with `kind:'foster_home'`.
- **Patterns to follow:** `src/components/SupplyDonationForm.tsx`, `src/components/VolunteerForm.tsx`, `src/lib/capaContact.ts`, `src/lib/formSubmission.ts`, `src/lib/europeanDateTime.ts` where date/time is needed.
- **Test scenarios:**
  - Happy path: completing all steps submits `kind:'foster_home'` with structured detail keys and shows success.
  - Edge case: optional phone/notes can be blank while required contact/home/availability answers block progress when blank.
  - Error path: `skipBackend` renders the prepared-email fallback link without launching mail during tests.
  - Integration: the English page language link points to the Portuguese foster form and vice versa.
- **Verification:** Browser verifier can advance through steps, fill required fields, assert payload shape, and capture desktop/mobile screenshots.

### U3. Update foster CTAs on help pages

- **Goal:** Replace the current foster `mailto:` buttons with links to the new foster form routes.
- **Requirements:** R1, R2, R11.
- **Dependencies:** U2.
- **Files:** `src/components/ajudar/AjudarFosterFamilies.astro`, `src/pages/en/help.astro`, `scripts/verify-volunteer-form-browser.mjs`.
- **Approach:** Update the Portuguese and English foster section buttons to route to their locale-specific form pages, change the trailing icon from email to arrow, and tag the links for browser assertions.
- **Patterns to follow:** The supply donation CTA pattern added to the help pages.
- **Test scenarios:**
  - Happy path: `/en/help/` contains a foster CTA to `/en/help/foster-home-form`.
  - Happy path: `/ajudar/` contains a foster CTA to `/ajudar/formulario-familia-acolhimento`.
  - Visual: the button remains readable and unclipped in the peach foster section at desktop and mobile widths.
- **Verification:** Browser verifier asserts link targets and captures the foster CTA section.

### U4. Verify, deploy, and commit

- **Goal:** Ship the form safely to production with evidence-backed checks.
- **Requirements:** R9, R10, R11.
- **Dependencies:** U1, U2, U3.
- **Files:** `CHANGELOG.md`, `scripts/verify-volunteer-form-browser.mjs`.
- **Approach:** Build with a fresh asset version, run endpoint and browser verification locally, visually inspect screenshots, deploy `dist/` to the Hetzner static root, restart the API, verify live routes/API/browser behavior, then commit and push.
- **Patterns to follow:** CAPA deploy notes in `AGENTS.md`; recent volunteer/supply form verification scripts.
- **Test scenarios:**
  - Build: Astro build succeeds with production API URL.
  - Browser: live verifier passes for volunteer, supply, and foster flows.
  - HTTP: live EN/PT foster form routes and `api.capapvl.org/health` return 200.
  - Visual: desktop and mobile foster screenshots show readable stepper and form controls without horizontal overflow.
- **Verification:** Final report cites actual build, endpoint, browser, visual, deploy, git commit, and push outputs.

---

## Scope Boundaries

- Do not add admin review/approval workflow for foster applicants in this pass.
- Do not collect identity documents, proof of address, financial data, or uploads in this public form.
- Do not change the existing adoption application flow beyond preserving regressions.
- Do not add a database migration unless implementation proves JSONB payload storage is insufficient.

---

## Risks & Dependencies

- **Questionnaire length:** A comprehensive form can feel heavy. Mitigate with a clear stepper, short labels, and logical grouping.
- **Email readability:** Structured answers can become noisy. Mitigate by composing grouped email text instead of dumping raw JSON.
- **Regression risk:** The shared form endpoint serves multiple forms. Mitigate with endpoint verifier coverage for old and new kinds.
- **Cache risk:** React island changes require a fresh `CAPA_ASSET_VERSION` before deploy because `_astro` assets are immutable.

---

## Sources & Research

- `src/components/SupplyDonationForm.tsx` and `src/components/VolunteerForm.tsx` define current public form patterns.
- `server/capa-api.ts` owns `/forms/submit` normalization, persistence, email delivery, and validation.
- `src/components/ajudar/AjudarFosterFamilies.astro` and `src/pages/en/help.astro` contain the current foster CTA buttons.
- The attached screenshot confirms the visible English CTA text is `I Want to Foster` in the `Foster Families` / `Open Your Home Temporarily` section.

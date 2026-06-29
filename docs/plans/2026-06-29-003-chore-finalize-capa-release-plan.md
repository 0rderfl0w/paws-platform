---
title: "chore: Finalize CAPA volunteer release"
type: chore
date: 2026-06-29
---

# chore: Finalize CAPA volunteer release

## Summary

Finalize the already-deployed CAPA volunteer-form/help-hero work by proving the working tree is safe to commit, preserving the project guidance update, pushing durable Git history, and ending with a clean local branch.

## Problem Frame

The live site and API have been deployed and verified, but the source repo still contains uncommitted changes. The remaining work is to turn the deployed state into durable GitHub history without mixing in secrets, generated output, or unrelated local noise.

## Requirements

- R1. The commit includes the deployed volunteer form/API support, help-hero Donate dropdown behavior, browser verifier, plans, changelog, and CAPA project guidance updates.
- R2. The commit excludes generated `dist/`, live deploy output, environment files, credentials, and any unrelated local artifacts.
- R3. Final verification proves the source tree has no whitespace errors, the static build succeeds, the volunteer endpoint verifier passes, and live/public URLs still respond.
- R4. The branch is pushed to `origin/main` so GitHub matches the deployed source state.
- R5. The local working tree is clean after push.

## Key Technical Decisions

- **Commit directly on `main`:** CAPA's recent repo history lands small deployed fixes directly on `main`, and the user asked to clean the already-deployed tree rather than open a PR.
- **Use one cohesive release commit:** The volunteer form, API contract, help hero actions, verifier, plans, changelog, and guidance all describe the same deployed release and should remain reviewable together.
- **Verify before and after push:** The live deployment already passed QA, but a final source build plus live smoke check guards against committing an unbuildable or stale state.

## Implementation Units

### U1. Audit the pending release diff

- **Goal:** Confirm the pending files are the intended deployed CAPA release and contain no secrets or generated output.
- **Requirements:** R1, R2
- **Dependencies:** none
- **Files:**
  - `AGENTS.md`
  - `CHANGELOG.md`
  - `docs/plans/2026-06-29-001-feat-volunteer-scheduling-form-plan.md`
  - `docs/plans/2026-06-29-002-feat-help-hero-actions-plan.md`
  - `docs/plans/2026-06-29-003-chore-finalize-capa-release-plan.md`
  - `scripts/verify-form-endpoint.mjs`
  - `scripts/verify-volunteer-form-browser.mjs`
  - `server/capa-api.ts`
  - `src/components/VolunteerForm.tsx`
  - `src/components/ajudar/AjudarPlayfulHero.astro`
  - `src/components/ajudar/AjudarVolunteerWays.astro`
  - `src/components/playful/PlayfulDonateMenu.astro`
  - `src/components/playful/PlayfulSiteNav.astro`
  - `src/i18n/index.ts`
  - `src/lib/formSubmission.ts`
  - `src/pages/ajudar/formulario-voluntariado.astro`
  - `src/pages/en/help.astro`
  - `src/pages/en/help/volunteer-form.astro`
- **Approach:** Review status and diffstat, scan for secret-like additions, and stage only the files above.
- **Patterns to follow:** `AGENTS.md` deploy/security guidance and recent conventional commits.
- **Test scenarios:**
  - Secret scan finds no private keys, SMTP tokens, database URLs with passwords, or env files in staged content.
  - `git diff --check` reports no whitespace errors.
- **Verification:** The staged file list matches the release scope and excludes generated output.

### U2. Re-run release verification

- **Goal:** Prove the committed source state still builds and the live CAPA surface still exposes the volunteer/help-hero behavior.
- **Requirements:** R3
- **Dependencies:** U1
- **Files:**
  - `scripts/verify-form-endpoint.mjs`
  - `scripts/verify-volunteer-form-browser.mjs`
  - `server/capa-api.ts`
  - `src/components/VolunteerForm.tsx`
  - `src/pages/ajudar/formulario-voluntariado.astro`
  - `src/pages/en/help/volunteer-form.astro`
- **Approach:** Run the production static build, endpoint verifier, and live browser verifier. Keep screenshots as temporary QA artifacts only.
- **Patterns to follow:** CAPA deploy verification in `AGENTS.md` and the existing verifier scripts.
- **Test scenarios:**
  - Build succeeds with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh asset version.
  - Endpoint verifier accepts valid volunteer payloads and rejects missing work types.
  - Browser verifier passes for PT/EN volunteer routes, optional phone, work-type checkboxes, hero links, Donate dropdowns, and sibling dropdown closing.
  - Live health and route marker checks return expected content.
- **Verification:** All verifier commands exit 0 and the live API service is active.

### U3. Commit, push, and confirm clean state

- **Goal:** Save the release to GitHub and remove the remaining open item.
- **Requirements:** R4, R5
- **Dependencies:** U1, U2
- **Files:**
  - same staged release files from U1
- **Approach:** Create one conventional commit, push `main` to `origin/main`, then confirm local and remote state match.
- **Patterns to follow:** Recent CAPA commit style such as `fix(forms): ...` and `fix(help): ...`.
- **Test scenarios:**
  - Commit succeeds and records the release files.
  - Push to `origin/main` succeeds.
  - `git status --short --branch` reports a clean tree with no ahead/behind state.
- **Verification:** The final commit hash is present on `origin/main` and the local working tree is clean.

## Scope Boundaries

- Do not change the deployed feature behavior while finalizing.
- Do not create a PR unless push to `main` is rejected.
- Do not include generated deploy output or server-only env files.

## Risks & Dependencies

- Push may fail if GitHub auth or branch protection rejects direct `main` updates; if that happens, preserve the local commit and report the blocker with the exact error.
- Browser verification can be slower than the source-only checks; failure should be diagnosed before committing only if it indicates current source/live behavior mismatch.

## Sources / Research

- `AGENTS.md` documents CAPA's Hetzner static/API deploy and secret-handling rules.
- `docs/plans/2026-06-29-001-feat-volunteer-scheduling-form-plan.md` defines the volunteer scheduling feature scope.
- `docs/plans/2026-06-29-002-feat-help-hero-actions-plan.md` defines the help hero action scope.
- Current `git status --short --branch` shows the release files are pending on `main`.

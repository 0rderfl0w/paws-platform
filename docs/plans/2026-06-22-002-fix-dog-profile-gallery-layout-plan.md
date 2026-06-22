---
title: "fix: Stabilize dog profile gallery layout"
type: fix
date: 2026-06-22
---

# fix: Stabilize dog profile gallery layout

## Summary

Fix the Playful dog profile regression where real shelter photos can force the profile gallery wider than its parent and crop the dog off-screen. The fix keeps the Playful profile shell, but treats dog-profile images as documentary photos that must fit inside the card instead of hero artwork that can be aggressively cropped.

---

## Problem Frame

The live profile `/cao?id=5fd31126-e731-45a8-ae30-b662d83ce4f5` renders Athos with the gallery blown out to image min-content width. On desktop the gallery measured wider than the profile container, pushing the name/story column out of the first viewport; on mobile the gallery measured far wider than the screen and was clipped by the overflow guard. Adopted and portrait-photo profiles show related symptoms: important content is pushed down, and ribbons/photos can look like cropped fragments rather than profile evidence.

---

## Requirements

### Layout containment

- R1. The profile gallery must never exceed the width of the profile container on desktop or mobile.
- R2. The name, size/adopted badge, personality, and story panel must remain visible in the intended column on desktop profiles.
- R3. Mobile profiles must show a bounded photo card and then the profile identity card without the image continuing past the viewport height.

### Photo treatment

- R4. Dog profile photos must prioritize showing the whole uploaded shelter photo over decorative cropping.
- R5. Gallery controls, photo counts, thumbnails, and adopted ribbons must remain visible and readable after containment.

### Verification coverage

- R6. The fix must be verified against multiple real profiles: the linked Athos profile, an available profile, an adopted profile, and a long-story profile.
- R7. The live deploy must be verified with HTTP checks and browser layout checks after the build sync.

---

## Key Technical Decisions

- **Constrain grid children at the gallery boundary:** Add `min-w-0`, `max-w-full`, and `w-full` containment to the gallery root/card so CSS Grid cannot size the track from image min-content width.
- **Use profile-photo fitting instead of hero cropping:** Switch the main gallery image to contained fitting inside a fixed-ratio card. CAPA photo uploads vary widely; preserving the whole image is more important than filling every pixel.
- **Keep the existing data-loading path:** Do not change API/fallback lookup, description parsing, adoption logic, or route query behavior. The bug is presentational.
- **Preserve Playful style without expanding scope:** Keep rounded cards, shadows, controls, thumbnail strip, and Playful shell; only adjust sizing/cropping and related spacing.

---

## Implementation Units

### U1. Contain the profile gallery card

- **Goal:** Prevent the gallery from growing beyond its parent and restore the intended desktop/mobile profile layout.
- **Requirements:** R1, R2, R3.
- **Dependencies:** None.
- **Files:**
  - `src/components/DogProfile.tsx`
- **Approach:** Add width containment to the `PhotoGallery` root and main card. Ensure the grid child can shrink inside the profile grid and that the card owns its own overflow rather than relying on page-level clipping.
- **Patterns to follow:** Existing Playful cards in `src/components/dogs/PlayfulDogCard.tsx` and profile wrappers in `src/pages/cao.astro` / `src/pages/en/dog.astro`.
- **Test scenarios:**
  - Athos desktop: the gallery width stays within the profile container and the identity/story column remains visible to the right.
  - Athos mobile: the gallery width matches the mobile content column and does not extend beyond the viewport.
  - Afonso desktop: a normal available profile still renders the gallery, identity, story, info, and CTA.
- **Verification:** Browser DOM checks report no horizontal overflow and gallery width not greater than the profile width.

### U2. Fit profile photos without cropping key content

- **Goal:** Make real uploaded dog photos display as profile evidence instead of cropped hero art.
- **Requirements:** R4, R5.
- **Dependencies:** U1.
- **Files:**
  - `src/components/DogProfile.tsx`
- **Approach:** Change the main gallery image to contained fitting inside the bounded card. Use a neutral Playful background so letterboxing looks intentional. Keep carousel arrows, count badge, thumbnails, and adopted ribbon layered over the card.
- **Patterns to follow:** Dog listing/profile accessibility labels already used in `src/components/dogs/PlayfulDogCard.tsx` and `src/components/DogProfile.tsx`.
- **Test scenarios:**
  - Athos first photo: the dog remains visible instead of being clipped off-screen by object cover.
  - Abby mobile: the adopted ribbon remains legible and does not appear as a blank clipped pill.
  - Alana desktop/mobile: portrait and long-story profiles remain readable, with photo controls still reachable.
- **Verification:** Screenshot review confirms the dog is visible in the first photo for the audited profiles and the adopted ribbon text is visible.

### U3. Verify, deploy, and live-check profile variants

- **Goal:** Ship the fix safely and verify the corrected layout on production.
- **Requirements:** R6, R7.
- **Dependencies:** U1, U2.
- **Files:**
  - `CHANGELOG.md`
  - `src/components/DogProfile.tsx`
- **Approach:** Run the production build and existing content smokes, then run profile-specific browser checks on local preview and live. Deploy with the permission-safe sync documented in `AGENTS.md` / `frontend` skill guidance.
- **Patterns to follow:** Existing build and live verification workflow used for recent CAPA Playful page deploys.
- **Test scenarios:**
  - Build completes with the profile island bundled.
  - Local browser checks pass for Athos desktop/mobile, Abby adopted mobile, Afonso desktop, and Alana desktop/mobile.
  - Live HTTP checks pass for `/cao/`, `/en/dog/`, and other core routes after deploy.
  - Live browser checks pass for the linked Athos URL and at least one English profile URL.
- **Verification:** The deployed site returns `200`, no profile browser check reports overflow, and the profile screenshot evidence shows the fixed gallery bounds.

---

## Scope Boundaries

- Do not change CAPA API contracts, dog IDs, photo storage, or fallback data.
- Do not redesign the listing cards or adoption pages as part of this fix.
- Do not introduce per-dog manual focal-point metadata in this pass; containment is the safer immediate fix for all existing photo shapes.

---

## Sources / Research

- Live screenshot evidence from Athos, Abby, Afonso, and Alana profiles showed the gallery root exceeding the profile container.
- `src/components/DogProfile.tsx` contains the affected `PhotoGallery` and profile layout.
- `src/pages/cao.astro` and `src/pages/en/dog.astro` provide the Playful route shells that should remain unchanged.

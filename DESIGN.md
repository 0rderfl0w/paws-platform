# DESIGN — CAPA Póvoa de Lanhoso

## Current direction: Playful Impact

CAPA's current redesign direction is **Playful Impact**: a warm, emotional, dog-rescue landing-page system that feels like a tactile charity poster rather than a generic SaaS template.

The direction is currently implemented on the noindex production review route:

- Live review: `https://capapvl.org/test-landing/`
- Source route: `src/pages/test-landing.astro`
- Components: `src/components/test-landing/*`
- Tokens/helpers: `src/styles/global.css` under “Playful Impact test-landing tokens”

Use this document as the design reference for future CAPA landing-page redesign work. The existing live `/` route may still use the older warm-earth system until Z approves a full replacement.

---

## Visual thesis

**High-energy compassion on a creamy canvas:** expressive Sora headlines, juicy orange action, real dog photography in organic blob/circle crops, pillowy cards, soft-brutalist rotations, and gentle scroll reveals that make each section feel hand-placed and alive.

The page should feel:

- warm, hopeful, and urgent without being guilt-heavy;
- playful and community-led, not corporate;
- tactile, rounded, and “squeezable”; 
- modern enough to build trust, but still clearly a local animal-rescue site.

---

## Non-negotiables

1. **Preserve CAPA's copy and flow unless Z explicitly reopens content strategy.** The design system changes presentation, not the rescue message.
2. **Use real animal/shelter photography.** Avoid abstract placeholders, fake 3D animals, or sterile stock imagery.
3. **No white box behind the hero dog image.** The hero image should float directly over the warm hero background as a blob/circle photo, with badges floating around it.
4. **No generic SaaS card-grid feel.** Cards can exist, but they must feel tactile: soft shadows, slight rotations, warm borders, generous radius.
5. **No sharp corporate UI.** Rounded shapes, pill buttons, hand-placed overlaps, and gentle wobble are core to the direction.
6. **Motion must be useful and accessible.** Scroll reveals should guide attention; always respect `prefers-reduced-motion`.

---

## Palette

| Role | Token / value | Usage |
|---|---:|---|
| Cream canvas | `#fff9f0` / `--color-playful-canvas` | Page background, hero background |
| Warm cream | `#f9f3ea` / `--color-playful-cream` | Image frames, subtle chips, skeletons |
| Ink | `#1d1b16` / `--color-playful-ink` | Main text |
| Muted brown | `#564337` / `--color-playful-muted` | Body copy, secondary labels |
| Soft line | `#dcc1b1` / `--color-playful-line` | Borders, dashed accents |
| Juicy orange | `#e67e22` / `--color-playful-orange` | Primary CTAs, active tabs, important badges |
| Deep orange | `#944a00` / `--color-playful-orange-dark` | Headlines, high-contrast labels |
| Peach | `#fedba3` / `--color-playful-peach` | Highlight cards, badges, footer surface |
| Watermelon | `#f56f6e` / `--color-playful-watermelon` | Hearts, emotional accents |
| Deep watermelon | `#a83639` / `--color-playful-watermelon-dark` | Tertiary strong accent |

### Color rules

- Default background is cream, not pure white.
- Orange is the main action color. Do not introduce a second dominant CTA color.
- Watermelon is for emotional hits only: hearts, rescue badges, micro-interactions.
- White cards are okay only when softened with warm borders/shadows/rotation.

---

## Typography

| Role | Typeface | Treatment |
|---|---|---|
| Display/headlines | `Sora` | Extra-bold, tight tracking, large poster-like blocks |
| Body/UI | `Plus Jakarta Sans` | Friendly, readable, medium body weights |
| Legacy fallback | `Inter` | Keep for existing non-redesigned pages |

### Type rules

- Headlines should feel chunky and poster-like: `font-extrabold`, tight tracking, strong hierarchy.
- Body copy should stay generous and readable: 16–18px, medium weight, relaxed line-height.
- Labels/chips use bold uppercase tracking sparingly.
- Avoid thin weights. They fight the tactile rescue-poster mood.

---

## Layout and composition

### Page rhythm

Use a generous landing-page rhythm:

1. Hero with strong emotional promise and one dominant dog photo.
2. Impact stats.
3. Why adopt / emotional case.
4. Featured dogs.
5. About CAPA / operational trust.
6. Ways to help.
7. Warm footer.

### Composition rules

- Treat the first viewport like a poster, not a document.
- Use a 12-column desktop grid or simple split hero, but let elements break the grid with small rotations and overlaps.
- Keep mobile as a single-column stack with enough side padding for rounded cards to breathe.
- Prefer organic visual anchors: blob image, round badges, pill chips, paw/heart marks.
- Avoid too many boxed sections in a row. Alternate open canvas, card groups, and one large feature panel.

---

## Shapes and elevation

| Element | Shape | Elevation |
|---|---|---|
| Primary buttons | Fully pill-shaped | Squishy orange shadow (`--shadow-squish`) |
| Cards | 1.75rem–2rem radius | Warm pillowy shadow |
| Hero dog image | Circle/blob | Floating over background, no white container box |
| Badges/chips | Pill | Small soft shadow |
| Large feature panels | 2.5rem+ radius | Pillowy shadow + warm border |

### Shape rules

- No sharp corners.
- Use tiny rotations (`-2deg` to `2deg`) on cards/chips to create hand-placed energy.
- Use organic masks for hero imagery when appropriate: `.blob-mask`.
- Keep borders warm and low-contrast; avoid gray corporate strokes.

---

## Motion

The current `/test-landing/` motion system is route-scoped and CSS/IntersectionObserver based.

### Motion types

| Motion | Use |
|---|---|
| Hero staged reveal | Badge, headline, copy, CTAs, trust chips, image enter in sequence |
| Section rise | Section headers fade/rise into view while scrolling |
| Card pop/stagger | Stats, why-adopt cards, dogs, help cards reveal one after another |
| Tactile hover | Buttons/cards lift or squish slightly |
| Blob morph | Hero image organically breathes on capable devices |

### Motion rules

- Motion should be visible enough to make scrolling feel alive, but not carnival-like.
- Use staggered reveals for grouped content.
- Dynamic React content must still be reveal-observed after hydration; the current test landing uses a `MutationObserver` for this.
- Respect `prefers-reduced-motion: reduce` by showing content statically with no transition.

---

## Component guidance

### Hero

- Headline should carry the emotional promise.
- Dog image floats on the right on desktop and sits below text on mobile.
- Use one or two floating badges around the image.
- Do **not** place a translucent white card behind the hero image.
- Primary CTA: orange pill. Secondary CTA: white/cream pill with orange border.

### Stats

- Stats are impact proof, not dashboard metrics.
- Use oversized display numbers, friendly icons, soft cards, slight rotations.
- Keep copy short and human.

### Why adopt

- Three cards maximum unless content requires more.
- Cards should focus on emotional outcomes: unconditional love, gratifying experience, joy/health.
- Icons can be simple hearts/sparks/smiles, but avoid generic line-icon packs unless styled thick and rounded.

### Featured dogs

- Dog cards must remain clickable and accessible.
- Use real dog photos with soft rounded image frames.
- Filters are rounded pills; active state is orange.
- Keep API + committed fallback behavior intact.
- Adopted dogs need visible `Adotado!`/`Adopted!` treatment when shown.

### About / trust panel

- Use a larger warm panel to break the card-grid rhythm.
- Pair mission copy with simple trust/operations stats.
- Keep CAPA's volunteer-run nature visible.

### Help CTA

- Treat helping as a set of easy paths: adopt, sponsor, volunteer, donate.
- Donation/IBAN callout should be readable on mobile and not overflow.
- Final CTA is a strong orange pill.

### Footer

- Warm peach surface, rounded top, soft blobs.
- Keep contact and donation info practical and scannable.

---

## Implementation notes

- CAPA is Astro 5 + React 19 islands + Tailwind 4 CSS-first tokens.
- Use Bun commands only.
- Existing legacy pages still use the older warm-earth palette (`primary-*`, `warm-*`, `nature-*`). Do not break them when extending Playful Impact.
- Keep Playful Impact additions route-scoped where possible. If global helpers are required, prefix/scope them clearly.
- `Layout.astro` supports `playfulFonts` so Sora/Plus Jakarta load only where needed.
- Build production review pages with:

```bash
CAPA_ASSET_VERSION=$(date -u +%Y%m%d-%H%M%S) PUBLIC_CAPA_API_URL=https://api.capapvl.org bun run build
```

- Live deploy target is `/home/deploy/apps/capapvl`; generated output should not be edited by hand.

---

## QA checklist

Before saying a Playful Impact page is ready:

- [ ] `bun run build` passes with production API env.
- [ ] Page is visually checked on desktop and mobile screenshots.
- [ ] No content is stuck hidden/blurred after scroll-reveal animation.
- [ ] `prefers-reduced-motion` users can see all content without animation.
- [ ] `/` remains unchanged if work is only for `/test-landing/`.
- [ ] `noindex, nofollow` is present on production review/test routes.
- [ ] Live page body is not the 404 page body.
- [ ] Referenced `/_astro` assets return 200.
- [ ] API health and featured-dog behavior are verified when dog cards are involved.

---

## What to avoid

- Cold white backgrounds.
- Thin fonts or corporate typography.
- Rectangular hero photo cards behind organic images.
- Shadow-heavy generic card grids with no composition.
- Abstract gradient blobs replacing actual dog imagery.
- Excessive animation that distracts from adoption/help actions.
- New runtime dependencies for simple CSS motion.
- Changing adoption/help copy without explicit approval.

# Blue Nest Montessori — Design System & Agent Guidelines

This file is loaded automatically by Claude Code. All AI agents working on this project
must follow these rules. Do NOT ignore them.

---

## Design Identity

The site uses a **pastel Montessori / scrapbook / chalk-inspired** visual system.
Every change must feel calm, breathable, and premium — not dense or corporate.

### Colour palette
| Token | Hex | Usage |
|---|---|---|
| Teal | `#5fc8c7` / `#7fd8d2` | Primary accents, CTAs, dividers |
| Pink | `#ef8cab` / `#cf7d9c` | Section kickers, headings, accents |
| Lavender | `#b99fe0` / `#a48cdc` | Cards, pills, secondary accents |
| Gold | `#f0bd55` / `#f7d774` | Stars, badges, warm accents |
| Paper cream | `#f9f4ee` | Section backgrounds |
| Blush header | `#fde8f0` | Sticky header background |
| Ink | `#5a4a42` (CSS var `--ink`) | All body text |

### Typography
- **Headings / display**: Chewy → `font-heading` (CSS class)
- **Body / UI**: Nunito → `font-body` (CSS class)
- Design tokens live in `frontend/styles/globals.css`

---

## Agent Rules — MUST follow

1. **Do NOT redesign sections** unless the user explicitly asks for a redesign.
2. **Make only the minimum change required** — no cleanup, no extra refactors, no bonus features.
3. **Do NOT introduce new UI components** unless the task explicitly requires one.
4. **Do NOT duplicate logo text in code** — the logo PNG (`/home/logo_new.png`) already
   contains "Blue Nest Montessori School" as part of the image. Do not render that text
   separately alongside the logo.
5. **Prefer small, controlled refinements** over full rewrites.
6. **Never change colours, fonts, shadows, or border-radius** unless that is the explicit task.

---

## Layout Consistency Rules

### Equal-height cards in a grid row
When `PolaroidCard` (or any card component) is wrapped in `<Reveal>` inside a CSS grid:
- The `Reveal` wrapper must receive `className="h-full"` so the motion.div fills its cell.
- The card `<article>` root must have `flex flex-col h-full`.
- The card content area (below the image) must have `flex-1` so it expands to fill remaining space.

### Image areas
- Cards using `PolaroidCard` use `aspect-[4/5]` for the image — keep this consistent.
- `StickerCard` uses `aspectRatio` prop — match across sibling cards.

### Section padding (standard)
```
px-4 py-8 sm:px-6 lg:px-8 lg:py-12          ← compact sections
px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24  ← spacious / editorial sections
```

---

## Component Patterns

### Decorative doodles
```tsx
<Doodle kind="flower|leaf|star|solidstar|cloud|heart|rainbow" className="absolute ... text-[color] opacity-*" />
```
Keep `opacity-40` to `opacity-65` for ambient doodles. Do not pile up doodles inside small sections.

### Scroll-reveal animation
```tsx
<Reveal delay={0.08}>…</Reveal>       // standard content block
<Reveal delay={0.08} className="h-full">…</Reveal>  // when wrapping a card in a grid
```

### Section anatomy
```
section-kicker  (small uppercase label)
section-title   (large heading, coloured)
section-subtitle (body lead paragraph)
[content]
```

### Page dividers
```tsx
<SectionDivider from="colorA" to="colorB" variant="wave|torn|scallop" />
<SectionDivider from="colorA" to="colorB" variant="scallop" flip />
```

### Cards
- **PolaroidCard** — image (aspect-[4/5]) + icon circle + heading + description
- **StickerCard** — polaroid-style photo only, with rotation prop
- **FeatureCard** — used in the hero chatbot / feature areas

### Buttons
- **PastelButton** variants: `rose` | `mint` | `lavender` | `butter`

---

## Responsiveness

- Mobile-first; breakpoints: `sm:` (640px) `md:` (768px) `lg:` (1024px) `xl:` (1280px)
- Card grids: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
- Two-column text: `lg:grid-cols-2`
- Hero: `min-h-[calc(100svh-4.5rem)]` mobile, `lg:min-h-[80vh]` desktop

---

## Header Structure (do not restructure without explicit instruction)

```
[Trust bar]        — non-sticky, scrolls away; 5 accreditation badges
[<header sticky>]
  Row 1: Logo (bleeds -my-6 desktop / -my-4 mobile) | Search | Social + Login + Cart
  Row 2: Branch contacts (Harrow, Borehamwood, Pinner + email) | MENU button
  Mobile: Logo + MENU only
[Slide-over nav]   — full-screen overlay, unchanged
```

Logo file: `/home/logo_new.png` — landscape, contains nest illustration + full brand name.
Logo bleed: `h-[168px] w-[320px] -my-6` desktop · `h-[100px] w-[190px] -my-4` mobile.

---

## What to always preserve

- All existing Doodle placements and SectionDivider sequences on the homepage
- Existing component props and TypeScript interfaces
- The pastel paper background (`#f9f4ee`) rhythm across sections
- Rounded corners (`rounded-[2rem]` to `rounded-[2.5rem]`) on cards and panels
- Drop-shadow style: `shadow-[0_10px_24px_rgba(90,74,66,0.12)]`

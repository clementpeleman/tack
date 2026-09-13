---
name: Tack
description: Open-source visual feedback for preview sites, pinned to the exact element.
colors:
  accent: "oklch(55% 0.25 262)"
  accent-strong: "oklch(48% 0.24 262)"
  accent-soft: "oklch(61% 0.22 262)"
  accent-secondary: "oklch(70% 0.20 45)"
  ink: "oklch(24.4% 0.024 260)"
  ink-mute: "oklch(50% 0.020 260)"
  ink-soft: "oklch(66% 0.014 260)"
  page: "oklch(99% 0.002 260)"
  surface: "oklch(96.4% 0.006 260)"
  surface-2: "oklch(92.8% 0.008 260)"
  line: "oklch(87% 0.010 260)"
  signal-resolved: "oklch(60% 0.13 165)"
  warn: "oklch(80% 0.16 95)"
  danger: "oklch(58% 0.19 25)"
typography:
  display:
    fontFamily: "PT Serif, Georgia, Times New Roman, serif"
    fontWeight: 700
    fontStyle: normal
  body:
    fontFamily: "IBM Plex Sans, -apple-system, Segoe UI, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Source Code Pro, ui-monospace, SFMono-Regular, monospace"
    fontWeight: 500
rounded:
  input: "10px"
  card: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.page}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  status-pill-open:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-resolved:
    backgroundColor: "{colors.signal-resolved}"
    textColor: "{colors.signal-resolved}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
---

# Design — Tack

A locked design system for this app. Every page/component redesign reads this file
before touching tokens or component voice. Do not regenerate per page — extend or
amend this file when the system needs to grow.

Supersedes the previous monochrome/azure-pin system entirely — that direction
(single-accent, near-black buttons, Geist/Geist Mono) is retired, not preserved.

## Genre

Modern-minimal (dev-tool / SaaS register), studied from a real reference rather
than picked from the catalog — see Provenance below.

## Provenance

Studied from **https://feedback.fish/** (public reference, adopted for Tack's own
rebrand — not a client of Tack's, no affiliation). Backbone: type pairing, paper,
primary accent, pill button shape, and the quarter-circle mosaic brand device.
One deliberate substitution: the source's body face is Roboto, which is swapped
for **IBM Plex Sans** — same "neutral grotesque" role, but Roboto is one of the
most over-used default faces in AI-generated UI and undercuts the point of a
rebrand. Everything else (PT Serif display, white/near-white paper, the
`oklch(55% 0.25 262)` blue, the orange used only in the brand mark) is taken
directly from the source's rendered CSS.

A secondary reference, **https://feedbackjar.com/**, was considered and rejected
as the backbone (warm cream paper, DM Sans, coral accent) in favor of
feedback.fish's serif/white/blue-orange direction, per explicit user choice.

## Macrostructure family

The September 2026 dashboard makeover changed the app's structure (see
§ Dashboard below); the marketing page and the widget keep theirs.

- **Marketing (landing):** existing hero → 3-step loop → context → agency →
  self-host → CTA → footer structure, unchanged. New type/color/button voice only.
- **App (dashboard):** sidebar with a project switcher, three sections (Inbox,
  Connect, Settings) and an account menu; the inbox is a master-detail
  workspace. Rules in § Dashboard.
- **Widget (embedded on third-party sites):** unchanged structure and interaction
  model. Gets the new color system and pill buttons; does **not** get the PT Serif
  display face — see Typography § Widget exception.

## Theme

```css
--color-accent:            oklch(55% 0.25 262);  /* light */
--color-accent-dark:       oklch(74% 0.19 262);  /* dark  */
--color-accent-secondary:  oklch(70% 0.20 45);   /* light, decorative-only */
--color-accent-secondary-dark: oklch(76% 0.16 45); /* dark, decorative-only */
--color-page:               oklch(99%   0.002 260);
--color-surface:             oklch(96.4% 0.006 260);
--color-ink:                 oklch(24.4% 0.024 260);
--color-line:                oklch(87%   0.010 260);
```

Full light/dark token blocks live in `apps/web/src/styles.css` (dashboard +
landing) and are mirrored in `packages/widget/src/styles/widget.css` (embedded
widget). Both files are the source of truth; this block is a summary.

## Typography

- **Display:** PT Serif, weight 700, roman (never italic). Page titles, hero
  headlines, section heads. One family, one weight — no light/heavy pairing
  within the display role.
- **Body:** IBM Plex Sans, weight 400 (500/600 for emphasis). Everything else —
  descriptions, comments, form values, button labels.
- **Label/mono:** Source Code Pro, weight 500. Selectors, keys, URLs,
  timestamps, status pills — data, not prose.
- **Widget exception:** the embedded widget renders on arbitrary third-party
  sites and does not load webfonts (reliability/perf on someone else's page,
  a constraint that predates this rebrand). It uses a system-sans stack for
  body and a system-mono stack for labels; it gets the new *color* system and
  pill buttons, not the new *type* system.

## Spacing

4-point named scale (`--space-xs` … `--space-lg`), unchanged from the previous
system — this rebrand doesn't touch spacing/layout rhythm.

## Motion

Unchanged from the existing system: named easings, `prefers-reduced-motion`
respected, one orchestrated entrance on the landing hero, no scroll-triggered
fade-everything.

## Microinteractions stance

- Silent success, no celebratory toasts.
- Disabled state: 45% opacity, `cursor: not-allowed`.
- Loading state: spinner replaces label, button stays the same size.

## CTA voice

- **Primary:** solid `--color-accent` fill, `--color-page`-on-accent text, fully
  pill-shaped (`border-radius: 999px`). This *replaces* the old near-black-ink
  button rule — the accent now does the work of primary actions directly.
- **Secondary:** transparent fill, 1px `--color-line` border, ink text, same
  pill radius as primary. Hover steps to `--color-surface`.
- Both apply everywhere a primary/secondary action appears: dashboard, landing,
  and the widget's popover buttons.

## What must stay consistent across dashboard / landing / widget

- The accent color and its restriction to interactive UI only — the secondary
  orange never appears outside the brand mark (mosaic device, empty states).
- The pill button shape and CTA voice.
- One status pill per row (this principle survives the rebrand unchanged).
- Flat panels, hairline border, no shadow at rest (shadows stay reserved for
  modals/popovers/the widget launcher).

## What may differ

- The widget's font stack (system, not PT Serif/IBM Plex Sans) — see Typography.
- Enrichment: only the landing page uses the brand mosaic device; the dashboard
  and widget do not.

## Exports

`apps/web/src/styles.css` and `packages/widget/src/styles/widget.css` are the
canonical token sources for their respective surfaces. No separate
`tokens.css`/Tailwind-`@theme`/DTCG exports exist yet — ask if another project
needs to consume this system.

## Dashboard

Added with the September 2026 makeover. These rules are checked against
PRODUCT.md's anti-references (metric strips, pill rows, nested cards, jargon)
on every screen.

### Type scale

| Role | Face | Size / weight | Class |
|---|---|---|---|
| Page title | PT Serif | 22px / 700 | `.text-page-title` |
| Pin title (panel) | PT Serif | 18px / 700 | inline |
| Section head | IBM Plex Sans | 15px / 600 | `.text-section` |
| Row title | IBM Plex Sans | 14px / 500 | inline |
| Body | IBM Plex Sans | 14px / 400 | default |
| Meta / labels | Source Code Pro | 12px (11px uppercase for labels) | `.text-meta` |

One serif size for page titles everywhere; no sans-serif page titles.

### Status is typographic

- Open: a 8px `--accent` dot at the end of the row.
- Resolved: row title struck through in `--ink-mute`, a `--signal` check
  where the dot was.
- Lost placement: the word `lost` in mono, `--danger`.
- The `StatusPill` is retired for rows. A pill is reserved for a single,
  glanceable discrete state on a detail surface, and even there prefer text.

### Rows

Pin rows are 56px, hairline-divided, thumbnail 40px with the marker as a
dot at the pin's position. Hover `--surface-2`; selected `accent` at 10%
mix; focus ring 2px `--accent` inset. Selection checkbox appears on hover,
on focus, or while any row is checked.

### Panels

One container level. A panel is either `--surface` fill without a border on
`--page`, or a hairline border without fill. Never both, never nested. The
inbox pane is the one exception that carries both fill and border, because
it sits beside a list that has neither.

### Empty states

One sentence, one primary action, at most one muted secondary line. No
icon, no illustration, no mosaic device in the dashboard.

### Errors and confirmation

Inline, under the field or beside the action, `--danger` text, `role=alert`.
Destructive actions (delete pin, revoke link, archive project) go through
`ConfirmDialog` (Radix AlertDialog). Success is announced via a visually
hidden `aria-live` region; no toasts.

### Keyboard, inbox

`j`/`k` or arrows move · `Enter` opens on small screens · `r` resolve /
reopen · `a` focus reply · `⌘↩` send · `x` check · `⌘A` check all visible ·
`Esc` clear checks, then close the pane. Hints sit under the list in
`.text-meta` and are hidden below `lg`.

### Primitives: shadcn/ui

The dashboard is built on shadcn/ui (`apps/web/components.json`, components
in `src/components/ui/*.tsx`, owned in the repo). Tack's tokens are mapped
onto shadcn's semantic variables at the bottom of `src/styles.css`
(`--background` → `--page`, `--primary` → `--accent`, `--muted-foreground`
→ `--ink-mute`, …). Two deliberate choices:

- shadcn's `accent` (a hover fill) maps to `--surface-2`; Tack's own
  `--accent` (the blue) is exposed to Tailwind as `brand` (`text-brand`,
  `bg-brand`) so the two never collide.
- `button.tsx` carries Tack's voice: pill radius, `default` is the accent
  fill, `outline` the hairline secondary, `destructive` an outline in
  `--danger`, never a red fill. Add components with `npx shadcn add`; do not
  pull blocks from component catalogues.

`Field` (label + input/textarea + inline error) and `ConfirmDialog` are the
only two local wrappers, both thin.

# Product

## Register

product

## Users

- **Owner** (primary buyer, and the landing-page audience): a developer or — the focus here — an **agency** running client review on preview/staging sites. Creates projects in the dashboard, installs the widget, triages pinned feedback, owns merge and deploy.
- **Reviewer** (no account): the agency's client/stakeholder who leaves pinned feedback through the widget on a preview site. Never sees the dashboard. Not the landing audience, but the reason Owners adopt Tack.

## Product Purpose

Open-source website feedback that turns client comments into reviewable pull requests. Reviewers pin comments to specific elements on preview URLs; Owners get exact context — URL, selector, screenshot, viewport, browser — instead of a mailbox of vague notes, and later turn it into scoped PR work. Success for an agency: install the widget, get the first pinned comment within minutes, triage without alt-tabbing, and never ask "where / what did you mean?" again.

## Brand Personality

Calm, practical, trustworthy, specific. Product-first, not marketing-first — the interface earns trust by being operational and intentional, not by performing confidence. A confident editorial voice (a serif display, not a geometric-sans "tool" register) with one primary accent — electric blue — doing the real interactive work (buttons, links, focus, the pin marker), plus a second, decorative-only orange reserved for the brand mark alone. Three words: **pinned, confident, specific.** Reads like a sharp, considered dev tool made by a thoughtful team — never a playful SaaS, a corporate suite, or a generic AI-generated app.

## Anti-references

- Purple/violet gradient SaaS soup, neon accents, decorative colour washes (the old Tack direction we are deliberately leaving).
- A third or fourth competing accent colour beyond the two named above — the orange never appears on interactive UI, only in the brand mark.
- AI mascots, "AI-powered" hero copy, magic-wand framing, AI theatre, "AI magic" aesthetics generally.
- Corporate-Jira weight; Slack-playful; Notion-trendy.
- Editorial-magazine affectation (display-serif + italic + drop caps + broadsheet grid) — Tack is not a magazine.
- Generic AI-landing scaffolding: tiny tracked uppercase eyebrows over every section, 01/02/03 numbered markers, identical icon-card grids, the hero-metric template.
- Cream / sand / beige warm-neutral body backgrounds.
- **Generic-SaaS dashboard tics** (this is where Core currently drifts and needs correction): pill badges as the default status/label affordance — one or two pills is a signal, four stacked on a row is noise; nested cards (a bordered card containing another bordered sub-card containing another) instead of one flat structural container; feature-card grids and excessive icon blocks used to fill space rather than convey information; overdesigned panels that dress up a simple state (an empty state, a status, a count) with more visual machinery than the content needs.
- Vague copy that describes a feeling instead of a fact ("seamless", "powerful") — say what happens, concretely.

## Design Principles

1. **One working accent, one decorative accent, nothing else.** The surface is a cool near-white/near-black neutral ramp (OKLCH hue 260); electric blue (OKLCH hue 262) is the sole interactive accent — buttons, links, focus, the pin marker — and the brand mark (a pin drop built from the brand's geometric mosaic device). A single orange (OKLCH hue 45) lives only in that mosaic device, never on interactive UI. A small, deliberate set of collaborator-pointer colours marks the different people pinning a preview — named markers (e.g. "Sam · client"), never decorative colour-soup, gradients or neon.
2. **Show the loop, don't claim it.** Prove "comment → exact context → reviewable work" with real product surfaces (a pinned comment, the captured selector/screenshot), not adjectives.
3. **Open-source honesty.** The code and self-host are first-class; lead with the real thing — live demo, Docker, the repo — not a gated funnel.
4. **Quiet confidence.** Restraint with intent: large type, real whitespace, no noise. Distinctive, not loud; "how was this made?", not "which AI made this?"
5. **Respect the reader's craft.** The audience is technical (agencies and devs). Concrete, precise, no fluff.
6. **Fewer, stronger layout moves.** One clear structural idea per screen beats several decorative ones. Prefer a single flat container with real internal hierarchy (typography, spacing, one rule line) over stacking bordered boxes to represent sub-sections.
7. **Tight spacing discipline, confident empty space.** Spacing is a deliberate scale, not default gaps. Empty space is not something to fill with a badge, an icon, or a card — it's part of the structure.
8. **Status and metadata are typographic first.** Reach for weight, colour-on-text, or a plain label before reaching for a pill. A pill earns its place when something is genuinely a discrete, glanceable state (e.g. one status per row); it's a design failure when four pills compete on the same row.
9. **Components tailored to Tack, not copied from a template.** A panel, a stat strip, an empty state should look like it was built for this specific data (pins, reviewers, placements), not like a generic dashboard-kit component that happens to show Tack's data.

## Accessibility & Inclusion

- Target **WCAG 2.2 AA** on the marketing surface as on the product.
- Body text ≥ 4.5:1 contrast (no light-grey-on-tinted-white); honour `prefers-reduced-motion`; visible focus on every interactive element; fully keyboard-operable.

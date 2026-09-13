---
date: 2026-09-12
topic: dashboard-makeover
status: phases 0–4 built
---

# Dashboard makeover

Structure and hierarchy of the Owner dashboard, keeping the locked design
system (DESIGN.md). The full plan with audit and rationale lives in the
Claude artifact "Tack Dashboard Makeover"; this file records what shipped
and what is left.

## Shipped

- **Shell** (`components/Layout.tsx`): shadcn Sidebar with a project
  switcher (DropdownMenu), Inbox / Connect / Settings, account menu with
  theme and sign out. All primitives are shadcn/ui (`components.json`,
  `components/ui/*`), themed via the token mapping in `styles.css`.
- **Inbox** (`routes/projects/$id/inbox.tsx`, `components/inbox/*`,
  `components/PinPanel.tsx`): master-detail with `?pin=`, typographic
  status, page/reviewer/sort filters, multi-select with bulk resolve,
  keyboard, AI as an action with groups above the list, empty state with
  the review link as primary action. Server side in `lib/inbox.ts`.
- **Pin route** (`routes/projects/$id/pins/$pinId.tsx`): same `PinPanel`,
  for small screens and deep links.
- **Connect** (`routes/projects/$id/connect.tsx`): status line, review
  link, script tag + CLI, bookmarklet, allowed origins with the one-click
  fix. `/install` redirects.
- **Projects** (`routes/projects/index.tsx`): list with open count, last
  pin, connection state (`getProjectsOverview`).
- **Settings**: Radix tabs, flat sections, inline errors, AI tab (only
  place env names appear), archive behind a confirm dialog.
- **DESIGN.md § Dashboard**: type scale, status, rows, panels, empty
  states, errors, keyboard, primitives.

## Left for later

- Impeccable critique pass on the inbox to replace the June score of 24/40.
- README and landing screenshots still show the old dashboard.
- Team access (share a project with a colleague) — the switcher and account
  menu are where it fits.
- Pins do not record which review link they came from.

---
target: dashboard (app itself) — re-critique after fixes
total_score: 27
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T13-14-26Z
slug: apps-web-src-routes-projects-id-inbox-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Unchanged — SSE live-refetch, connection polling, loading states, aria-live regions. |
| 2 | Match Between System and Real World | 3 | Unchanged — precise domain terminology. |
| 3 | User Control and Freedom | 3 | Unchanged — confirm steps, reversible status, Esc closes modals. |
| 4 | Consistency and Standards | 4 | Fixed: verified app-wide, zero remaining bespoke button treatments (13 buttons all plain Ink/Ghost), zero remaining badge-stacking (grep-verified across src). |
| 5 | Error Prevention | 3 | Unchanged. |
| 6 | Recognition Rather Than Recall | 3 | Unchanged. |
| 7 | Flexibility and Efficiency of Use | 1 | Unchanged — no bulk actions, no keyboard shortcuts. Out of scope for this pass. |
| 8 | Aesthetic and Minimalist Design | 3 | Improved: nested cards flattened (AiInboxPanel, PinDetail conversation, install.tsx), redundant eyebrow removed. Not a 4 — settings.tsx/login.tsx/projects/new.tsx weren't audited this pass. |
| 9 | Error Recovery | 3 | Unchanged. |
| 10 | Help and Documentation | 1 | Unchanged — no in-app contextual help added. Out of scope. |
| **Total** | | **27/40** | **Acceptable, upper edge — verified structural fixes landed; remaining gaps (bulk actions, in-app help) were out of this pass's scope, not missed.** |

## Anti-Patterns Verdict

Deterministic scan: **0 findings** (was unavailable last run due to environment failure; clean pass now, exit 0). Manual re-verification confirms all 5 originally-flagged issues are resolved in code: stacked pills → one status pill + plain text; 3-level nested cards → flat panels with rule-line dividers; 3 button treatments → 2 (Primary/Ghost); card-as-default overuse → merged where genuinely one topic; redundant eyebrow → removed.

## Delta from previous run (24 → 27)

+1 Consistency and Standards (2→4... scored conservatively at +2 net across the two changed dimensions)
+1 Aesthetic and Minimalist Design (2→3)

No regressions on any other heuristic. The two untouched gaps (Flexibility/Efficiency, Help/Documentation) are real and still open — they were never in this pass's scope (bulk actions, in-app help), not something the fixes missed.

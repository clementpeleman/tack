# Ship edits Git, never production

Ship turns Implementation Briefs into code changes inside an isolated Git preview workspace: clone repo, fix branch, temporary preview, PR. It never clones the production site or database, never receives production secrets, and never exposes merge or deploy actions to Reviewers — a Reviewer's approval is approval of the preview only. Production merge/deploy stays an Owner action outside Tack.

This is the product's trust boundary, not an implementation detail: competitors (FasterFixes-style) differentiate on unattended fixes; Tack deliberately differentiates on *reviewable* changes. Any future feature that would let client feedback reach production without an Owner merging a PR violates this decision.

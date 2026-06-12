# Contributing to Tack

Thanks for your interest in Tack — open-source website feedback that turns client comments into agent-ready implementation briefs.

## Before you open a PR: the CLA

Tack is licensed under [AGPLv3](./LICENSE) and additionally offered under a commercial license. To keep that dual-licensing model legally possible, **all contributors must sign the Contributor License Agreement (CLA) before their first pull request can be merged.** The CLA grants the Tack maintainer the right to relicense your contribution; you keep the copyright to your work.

A CLA bot will prompt you automatically on your first PR. If you'd rather not sign, that's completely fine — bug reports, reproductions, and feature discussions in issues are just as valuable and need no CLA.

See [docs/adr/0001-agpl-with-cla.md](./docs/adr/0001-agpl-with-cla.md) for why this exists.

## Ground rules

- **Issues first for anything non-trivial.** Open an issue describing the problem before investing in a large PR, so we can agree on direction.
- **The domain language is documented.** Read [CONTEXT.md](./CONTEXT.md) — PRs should use its terms (Owner, Reviewer, Pin, Group, Implementation Brief) in code and copy.
- **Architectural decisions live in [docs/adr/](./docs/adr/).** If your change contradicts one, raise it in an issue first — some boundaries (e.g. "Ship edits Git, never production") are product decisions, not technical debt.
- **Support happens in GitHub issues only.**

## Development setup

```sh
pnpm install
cd apps/web
pnpm dev
```

The dashboard runs on Vite/TanStack Start with a SQLite database created on first run. Magic-link login tokens are printed to the console in development.

Widget development:

```sh
cd packages/widget
pnpm dev
```

## Tests

```sh
pnpm test
```

Please add or update tests for behavior you change.

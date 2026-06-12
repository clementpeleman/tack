# External reads authenticate with an owner token, never the project key

The project key (`pk_…`) is public by design — it sits in the embed script tag, visible to anyone who views source on the preview site, and the widget API accepts it. Owner-side data (Groups, Implementation Briefs, the full inbox) must therefore never be readable with the project key alone: the MCP server and any future external integration authenticate with a revocable, owner-scoped token generated in project settings. Magic-link sessions are not an alternative — agents and CLI tools cannot complete that flow.

## Consequences

- A leaked owner token exposes feedback data, so tokens are revocable and v1 MCP is read-only to cap the blast radius.
- "Simplifying" MCP auth to reuse `pk_` would leak briefs to anyone who can view-source the preview site. Don't.

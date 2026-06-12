# Tack

Open-source website feedback that turns client comments into reviewable pull requests. Reviewers pin comments on preview sites; owners triage them with full context and, later, turn them into scoped PR work.

## Language

### People

**Owner**:
The developer or agency person who manages projects in the dashboard, triages pins, and installs the widget. Owns merge and deploy — always.
_Avoid_: admin, developer (as a role name), user

**Reviewer**:
A client or stakeholder who leaves feedback through the widget on a preview site. Has no account and never sees the dashboard.
_Avoid_: client, user, guest

### Core loop

**Project**:
One website under review, owned by an Owner. Identified by a project key; bound to one preview URL.

**Pin**:
A piece of feedback anchored to a specific element on a page of the preview site, carrying its context (URL, selector, screenshot, viewport, browser).
_Avoid_: comment (a pin *contains* comments), annotation, tack (reserved for brand)

**Reply**:
A threaded message under a pin, from either the Owner or the Reviewer.

**Widget**:
The overlay Tack injects on the preview site. The Reviewer's only surface.

**Dashboard**:
The Owner's web app: inbox, pin detail, settings. Shares visual language with the Widget but is a separate app.

**Preview site**:
The staging/preview deployment of the Project's website where the Widget runs. Never production.

**Placement state**:
How confidently a pin can be re-anchored on the live page: **anchored** (id or selector match), **approximate** (xpath or coordinates only), or **lost** (nothing matches; screenshot is the source of truth).

**Connected**:
A Project's state once the widget has successfully phoned home from an origin matching the preview URL. The install-flow success signal.

### Product layers

**Tack Core**:
The complete OSS feedback loop: widget, pins, replies, resolve, inbox, notifications, self-host. Must stand alone — not demoware.

**AI Inbox**:
The analysis layer over the inbox: labels, priorities, summaries, Groups, and Implementation Briefs. Triggered manually by the Owner; never changes code.

**Ship**:
The execution layer: turns a Group's Implementation Brief into a branch and pull request inside a Git preview workspace. Edits Git, never production.

### AI Inbox terms

**Analysis run**:
One manual `Analyze pins` execution over a Project's open pins, producing insights and Groups. Cost-capped per run and per month.

**Group**:
A set of related or duplicate pins clustered by an Analysis run, with a task-style title and an Implementation Brief.
_Avoid_: cluster (same concept; "Group" is canonical, matching the schema)

**Implementation Brief**:
Scoped developer tasks generated per Group — what to change, never how to deploy. The default input for Ship.
_Avoid_: spec, ticket

### Ship terms

**Git preview workspace**:
An isolated, short-lived environment created from the Project's Git repo where an agent makes scoped changes and exposes a temporary preview. No production data, no production secrets.
_Avoid_: sandbox (the workspace runs *in* a sandbox; they're not the same thing), staging copy

**Preview approval**:
A Reviewer's "Looks good" on a Ship preview. Approval of the preview only — never permission to merge or deploy.

### Integration

**Owner token**:
A credential an Owner generates to let external tools (e.g. MCP clients) read a Project's pins, Groups, and Implementation Briefs. Owner-scoped and revocable — never the project key, which is public on the preview site.
_Avoid_: API key (ambiguous with the project key)

### Deployment

**Self-host**:
An Owner running Tack on their own infrastructure from the OSS repo. Gets the complete Core loop; AI Inbox is opt-in with their own key.

**Hosted**:
Tack run as a paid service by the Tack team. The only deployment with tiers, included AI runs, and (later) Ship jobs.

## Flagged ambiguities

- **"cluster" vs "group"** — ship-v1.md says "cluster", ai-inbox-v1.md and the schema say "group". Resolved: **Group** is canonical; update ship-v1.md language when next edited.

## Example dialogue

> **Dev:** A reviewer wants to approve the fix so it goes live.
> **Domain expert:** A Reviewer can't make anything go live. They give Preview approval on the Ship preview. The Owner merges the PR and deploys — that's outside Tack.
> **Dev:** And if the reviewer's pin no longer matches anything after a redesign?
> **Domain expert:** Then its placement state is *lost*: the widget shows a grey dot at the last coordinates and the inbox shows a `lost` pill. The screenshot on the pin is the source of truth at that point. We never auto-hide lost pins.
> **Dev:** When the owner clicks Analyze pins, does that touch the code?
> **Domain expert:** Never. An Analysis run only produces labels, summaries, Groups, and Implementation Briefs. Code only changes when the Owner explicitly starts a Ship job from a Group.

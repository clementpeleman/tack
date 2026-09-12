# @usetack/cli

Installs the [Tack](https://github.com/clementpeleman/tack) feedback widget into your project.

```bash
npx @usetack/cli init
```

That talks to the hosted service at tack.peleman.io. Self-hosting? Add `--host https://tack.example.com` or set `TACK_HOST`.

It signs you in through the browser, finds your framework's entry file, shows you the exact diff, and writes it only after you confirm.

## Commands

```
tack init                 Detect the framework and add the widget
tack login                Sign in to a Tack instance
tack logout               Revoke this machine's token and forget it
tack status               Show host, sign-in state and detected framework
tack project create [name] [--preview-url <url>]
                          Create a project; name defaults to package.json
tack project list         Show your projects
tack origin add <url>     Allow an extra local dev origin
tack share                Share your running dev server through a tunnel, until Ctrl-C
tack share <url>          Create a review link that serves the site with the widget injected
tack share list           Show active review links
tack share revoke <id>    Close a review link
```

## Share a preview without touching it

```bash
npx @usetack/cli share https://preview.acme.com --passcode monday
```

Prints a link on the instance's share domain. Tack serves the site through that link with the widget already on it, so there is nothing to install on the site and a strict Content-Security-Policy on the preview does not get in the way. Links expire after 7 days by default (`--days`), can require a passcode, and can be closed with `tack share revoke <id>`.

Requires the instance to have `TACK_SHARE_DOMAIN` configured.

### Share your dev server

```bash
npx @usetack/cli share
```

With no URL, `share` starts your `dev` script if nothing is listening yet (using the port the server actually reports), then tunnels it (or `--port`) through [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) and puts a review link in front of it. Hot reload keeps working through the link. The link lives while the command runs and is revoked on Ctrl-C; the share expires after a day regardless. cloudflared must be installed (`brew install cloudflared` on macOS); Cloudflare sees the traffic, so use a deployed preview for anything you would not send through a third party.

## Supported frameworks

| Framework | File patched |
|---|---|
| Next.js (App Router) | `app/layout.tsx` |
| Vite | your entry module, e.g. `src/main.tsx` |
| SvelteKit | `src/app.html` |
| Plain HTML | `index.html` |

Anything else falls back to printing the snippet — `init` never leaves a file half-written.

## When the widget loads

By default the widget is **off unless an environment variable is set**, so it can't reach production by accident:

- **Next.js** — set `TACK_ENABLED=1` locally and on preview deploys.
- **Vite** — on automatically in `vite dev`; set `VITE_TACK_ENABLED=true` on preview deploys.
- **SvelteKit / plain HTML** — no build-time environment is available, so the tag is unconditional. `init` warns about this.

Gating on `NODE_ENV` alone would be wrong here: a Vercel preview deploy runs with `NODE_ENV=production`, which is exactly where you want feedback.

Override with `--gate dev` (development only) or `--gate none` (always on — the right choice when the site you're patching *is* the preview site).

## Options

```
--host <url>         Your instance, for self-hosting (default: $TACK_HOST, else the hosted service)
--project <id|pk_>   Project to install, skips the prompt
--origin <url>       Dev origin to allow (default: detected dev port)
--gate <env|dev|none>
--cwd <dir>          Project directory (default: current)
--yes                Skip the confirmation prompt
--dry-run            Show the diff and exit without writing
--no-browser         Print the URL instead of opening a browser
--token <token>      Discouraged; prefer TACK_TOKEN
```

## Environment

| Variable | Purpose |
|---|---|
| `TACK_HOST` | Instance URL for self-hosting; overrides the hosted default |
| `TACK_TOKEN` | Token for CI and other non-interactive use |
| `TACK_CONFIG_DIR` | Override where credentials are stored |
| `NO_COLOR` | Disable colour |

Credentials live in `~/.tack/credentials.json` (or `$XDG_CONFIG_HOME/tack/`), written `0600` and keyed by host so several instances can be signed in at once.

Prefer `TACK_TOKEN` over `--token`: arguments are visible in `ps` and land in shell history.

## Notes

- Re-running `init` is a no-op — the inserted block is marked, so it is never double-inserted.
- The widget only renders at viewports 768px and wider.
- A token issued to the CLI can list projects, create one, create and revoke share links, and register **loopback** dev origins. It cannot read pins or reviewer feedback, and it cannot allowlist a remote domain — that requires the dashboard.

## License

MIT. The rest of the Tack repository is AGPL-3.0.

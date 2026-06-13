import { createFileRoute } from '@tanstack/react-router'
import { verifyMagicLinkToken, getSessionCookie } from '#/lib/auth'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlPage(body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Sign in to Tack</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fbfbfc; color: #1c1c20;
  }
  .card {
    width: 100%; max-width: 360px; padding: 2rem; text-align: center;
  }
  .mark { display: inline-flex; align-items: center; gap: .5rem; margin-bottom: 1.5rem; }
  .dot { width: 16px; height: 16px; border-radius: 999px; background: #c2603a; }
  h1 { font-size: 1.125rem; font-weight: 600; margin: 0 0 .25rem; }
  p { font-size: .875rem; color: #57575e; margin: 0 0 1.5rem; line-height: 1.5; }
  button, .link {
    display: inline-block; width: 100%; box-sizing: border-box;
    padding: .7rem 1rem; border-radius: .5rem; border: none; cursor: pointer;
    background: #4f46c9; color: #fff; font-size: .875rem; font-weight: 500;
    text-decoration: none;
  }
  button:hover, .link:hover { opacity: .92; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1f; color: #f5f5f6; }
    p { color: #a8a8b0; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="mark"><span class="dot"></span><strong>tack</strong></div>
    ${body}
  </div>
</body>
</html>`
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export const Route = createFileRoute('/api/auth/verify')({
  server: {
    handlers: {
      // GET only renders a confirm button — it never consumes the token, so
      // email security scanners (Outlook SafeLinks, Mimecast, Proofpoint) that
      // prefetch links can't burn a one-time link before the human clicks.
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')
        if (!token) {
          return htmlPage(
            '<h1>Link incomplete</h1><p>This sign-in link is missing its token. Request a new one.</p><a class="link" href="/login">Back to sign in</a>',
            400,
          )
        }
        return htmlPage(
          `<h1>Sign in to Tack</h1><p>Click below to finish signing in on this device.</p>
           <form method="POST" action="/api/auth/verify">
             <input type="hidden" name="token" value="${escapeHtml(token)}" />
             <button type="submit">Sign in</button>
           </form>`,
        )
      },

      // POST consumes the token. Scanners follow GETs but don't submit forms.
      POST: async ({ request }) => {
        const form = await request.formData()
        const token = form.get('token')

        if (typeof token !== 'string' || !token) {
          return htmlPage(
            '<h1>Link incomplete</h1><p>This sign-in link is missing its token. Request a new one.</p><a class="link" href="/login">Back to sign in</a>',
            400,
          )
        }

        const result = await verifyMagicLinkToken(token)

        if (!result) {
          return htmlPage(
            '<h1>Link expired</h1><p>This sign-in link is invalid or has already been used. Request a fresh one.</p><a class="link" href="/login">Back to sign in</a>',
            401,
          )
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: '/projects',
            'Set-Cookie': getSessionCookie(result.sessionId),
          },
        })
      },
    },
  },
})

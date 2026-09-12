import { createFileRoute } from '@tanstack/react-router'
import { createMagicLinkToken } from '#/lib/auth'
import { sendEmail } from '#/lib/email'
import { getClientIp, magicLinkRateLimited } from '#/lib/rate-limit'
import { publicOrigin, PublicUrlError } from '#/lib/public-url'

export const Route = createFileRoute('/api/auth/send-magic-link')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null)
        const email = body?.email

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return Response.json(
            { error: 'Valid email required' },
            { status: 400 },
          )
        }

        const normalizedEmail = email.toLowerCase().trim()
        const { emailLimited, ipLimited } = magicLinkRateLimited(
          normalizedEmail,
          getClientIp(request),
        )

        if (!emailLimited && !ipLimited) {
          const token = await createMagicLinkToken(normalizedEmail)

          // token is null when the email has no account and signup is closed;
          // we still return ok below so accounts can't be enumerated.
          if (token) {
            let base: string
            try {
              base = publicOrigin(request)
            } catch (err) {
              if (err instanceof PublicUrlError) {
                console.error(`[tack] ${err.message}`)
                return Response.json(
                  { error: 'This instance is missing TACK_PUBLIC_URL. Ask the administrator to set it.' },
                  { status: 500 },
                )
              }
              throw err
            }
            const verifyUrl = new URL('/api/auth/verify', base)
            verifyUrl.searchParams.set('token', token)

            await sendEmail({
              to: normalizedEmail,
              subject: 'Sign in to Tack',
              text: `Sign in to Tack:\n\n${verifyUrl.toString()}\n\nThis link expires in 15 minutes.`,
            })
          }
        }

        return Response.json({ ok: true })
      },
    },
  },
})

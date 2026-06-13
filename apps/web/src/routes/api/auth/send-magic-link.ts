import { createFileRoute } from '@tanstack/react-router'
import { createMagicLinkToken } from '#/lib/auth'
import { sendEmail } from '#/lib/email'
import { getClientIp, magicLinkRateLimited } from '#/lib/rate-limit'

export const Route = createFileRoute('/api/auth/send-magic-link')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
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
            const verifyUrl = new URL('/api/auth/verify', request.url)
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

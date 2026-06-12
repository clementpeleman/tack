export interface EmailMessage {
  to: string
  subject: string
  text: string
}

let startupWarningShown = false

function warnNoEmailProvider(): void {
  if (startupWarningShown) return
  startupWarningShown = true
  console.warn(
    '\n[tack] Email disabled: set RESEND_API_KEY or SMTP_HOST + SMTP_FROM for auth and notifications.\n',
  )
}

async function sendViaResend(message: EmailMessage): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'Tack <notifications@tack.local>',
      to: message.to,
      subject: message.subject,
      text: message.text,
    }),
  })
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`)
}

async function sendViaSmtp(message: EmailMessage): Promise<void> {
  const nodemailer = await import('nodemailer')
  const host = process.env.SMTP_HOST!
  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: message.to,
    subject: message.subject,
    text: message.text,
  })
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_FROM),
  )
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(message)
    return
  }

  if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
    await sendViaSmtp(message)
    return
  }

  warnNoEmailProvider()
  console.log(
    `\n[tack] Email to ${message.to}\n  Subject: ${message.subject}\n  ${message.text}\n`,
  )
}

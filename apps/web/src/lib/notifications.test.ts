import { describe, expect, it } from 'vitest'
import { buildWebhookPayload } from './notifications'

describe('buildWebhookPayload', () => {
  it('uses provider-specific request bodies for Discord and Slack', () => {
    const message = {
      title: 'New pin on Acme',
      body: 'Mia left feedback on /pricing',
      url: 'https://preview.example.com/pricing',
    }

    expect(buildWebhookPayload('discord', message)).toEqual({
      content:
        '**New pin on Acme**\nMia left feedback on /pricing\nhttps://preview.example.com/pricing',
    })
    expect(buildWebhookPayload('slack', message)).toEqual({
      text:
        '*New pin on Acme*\nMia left feedback on /pricing\nhttps://preview.example.com/pricing',
    })
  })
})

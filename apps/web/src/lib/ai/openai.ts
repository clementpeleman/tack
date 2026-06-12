import { parseAiInboxResult } from './validation'
import type { AiInboxResult, AiPinInput, AiUsage } from './types'

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pins', 'groups'],
  properties: {
    pins: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pinId', 'label', 'priority', 'summary', 'ambiguous'],
        properties: {
          pinId: { type: 'string' },
          label: {
            type: 'string',
            enum: ['bug', 'design', 'copy', 'content', 'feature', 'question', 'other'],
          },
          priority: {
            type: 'string',
            enum: ['quick_win', 'needs_decision', 'blocks_launch', 'normal'],
          },
          summary: { type: 'string' },
          ambiguous: { type: 'boolean' },
        },
      },
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'summary',
          'type',
          'priority',
          'implementationBrief',
          'pinIds',
        ],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          type: {
            type: 'string',
            enum: ['bug', 'design', 'copy', 'content', 'feature', 'question', 'other'],
          },
          priority: {
            type: 'string',
            enum: ['quick_win', 'needs_decision', 'blocks_launch', 'normal'],
          },
          implementationBrief: { type: 'string' },
          pinIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
}

interface OpenAIResponseBody {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
  }
}

export class AiConfigurationError extends Error {}

function extractResponseText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === 'string') return body.output_text

  for (const output of body.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text
      }
    }
  }

  throw new Error('OpenAI response did not include output text')
}

function readUsage(body: OpenAIResponseBody): AiUsage {
  return {
    inputTokens: body.usage?.input_tokens ?? body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? body.usage?.completion_tokens ?? 0,
  }
}

export function createAiInboxPrompt(pins: AiPinInput[]): string {
  return JSON.stringify(
    {
      task: 'Analyze client website feedback pins for a developer inbox.',
      guidance: [
        'Group duplicate or tightly related comments together.',
        'Use quick_win for small copy/style/content changes.',
        'Use needs_decision when the client intent is ambiguous.',
        'Use blocks_launch only for issues that likely block release.',
        'Write implementation briefs as scoped developer tasks, not broad agent instructions.',
        'Do not suggest automatic production deploys.',
      ],
      pins,
    },
    null,
    2,
  )
}

export async function analyzePinsWithOpenAI(args: {
  apiKey: string | undefined
  model: string
  pins: AiPinInput[]
  fetcher?: typeof fetch
  maxOutputTokens?: number
}): Promise<{ result: AiInboxResult; usage: AiUsage }> {
  if (args.pins.length === 0) {
    return { result: { pins: [], groups: [] }, usage: { inputTokens: 0, outputTokens: 0 } }
  }

  if (!args.apiKey) {
    throw new AiConfigurationError('OPENAI_API_KEY is not configured')
  }

  const fetcher = args.fetcher ?? fetch
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      max_output_tokens: args.maxOutputTokens ?? 1200,
      input: [
        {
          role: 'system',
          content:
            'You are Tack AI Inbox. Return only valid structured JSON for triaging website feedback pins.',
        },
        {
          role: 'user',
          content: createAiInboxPrompt(args.pins),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'tack_ai_inbox',
          strict: true,
          schema: outputSchema,
        },
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${message}`)
  }

  const body = (await response.json()) as OpenAIResponseBody
  const text = extractResponseText(body)
  return {
    result: parseAiInboxResult(
      text,
      args.pins.map((pin) => pin.id),
    ),
    usage: readUsage(body),
  }
}

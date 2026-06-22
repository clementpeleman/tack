import { describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => [
        {
          id: 'project_1',
          projectKey: 'pk_test',
          previewUrl: 'https://preview.example.com',
        },
      ]),
    })),
  })),
}))

vi.mock('#/db/index', () => ({ db: dbMock }))

describe('/api/widget/events', () => {
  it('blocks event streams from an origin outside the project preview URL', async () => {
    const { Route } = await import('./events')
    // handlers is typed as a union (object | factory); narrow to read GET.
    const handlers = Route.options.server?.handlers as
      | { GET?: (ctx: unknown) => Promise<Response> }
      | undefined
    const handler = handlers?.GET
    expect(handler).toBeTypeOf('function')

    const res = await handler!({
      request: new Request(
        'https://tack.example.com/api/widget/events?projectKey=pk_test',
        { headers: { origin: 'https://evil.example.com' } },
      ),
    } as never)

    expect(res.status).toBe(403)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})

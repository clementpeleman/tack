import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, ListChecks } from 'lucide-react'
import { Layout } from '#/components/Layout'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { Tabs } from '#/components/ui/Tabs'
import { PinPanel } from '#/components/PinPanel'
import { AiGroups } from '#/components/inbox/AiGroups'
import { InboxEmpty } from '#/components/inbox/InboxEmpty'
import { PinListRow } from '#/components/inbox/PinListRow'
import { buildAgentPrompt } from '#/lib/agent-prompt'
import {
  analyzeProjectPins,
  getProjectWithPins,
  type AiGroupSummary,
  type PinWithComment,
} from '#/lib/inbox'
import { getTimeAgo } from '#/lib/pin-display'
import {
  addOwnerReply,
  bulkUpdatePinStatus,
  deleteProjectPin,
  updatePinStatus,
} from '#/lib/project-pin-actions'
import { getCurrentUser } from '#/lib/user'

type StatusFilter = 'open' | 'resolved' | 'all'
type SortOrder = 'newest' | 'oldest' | 'page'

export const Route = createFileRoute('/projects/$id/inbox')({
  component: InboxPage,
  validateSearch: (search: Record<string, unknown>): { pin?: string } =>
    typeof search.pin === 'string' && search.pin ? { pin: search.pin } : {},
  loader: async ({ params }) => {
    const [data, user] = await Promise.all([
      getProjectWithPins({ data: { id: params.id } }),
      getCurrentUser(),
    ])
    return { ...data, userEmail: user.email }
  },
})

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

function InboxPage() {
  const { project, pins: allPins, aiInbox, aiEntitlement, sidebarProjects, userEmail } =
    Route.useLoaderData()
  const { pin: selectedId } = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()

  const [status, setStatus] = useState<StatusFilter>('open')
  const [page, setPage] = useState<string>('all')
  const [reviewer, setReviewer] = useState<string>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)
  const [live, setLive] = useState('')
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Live updates from the widget: reload the loader, keep the selection.
  useEffect(() => {
    const es = new EventSource(`/api/projects/${project.id}/events`)
    es.onmessage = () => {
      if (document.visibilityState === 'visible') void router.invalidate()
    }
    return () => es.close()
  }, [project.id, router])

  // Numbers as the widget shows them: oldest pin is #1.
  const numberById = useMemo(() => {
    const byAge = [...allPins].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    return new Map(byAge.map((p, i) => [p.id, i + 1]))
  }, [allPins])

  const pages = useMemo(
    () => Array.from(new Set(allPins.map((p) => p.url))).sort(),
    [allPins],
  )
  const reviewers = useMemo(
    () => Array.from(new Set(allPins.map((p) => p.reviewerName ?? 'Anonymous'))).sort(),
    [allPins],
  )
  const groupPinIds = useMemo(() => {
    if (!groupId) return null
    const group = aiInbox.groups.find((g) => g.id === groupId)
    return group ? new Set(group.pinIds) : null
  }, [aiInbox.groups, groupId])

  const visible = useMemo(() => {
    const list = allPins.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (page !== 'all' && p.url !== page) return false
      if (reviewer !== 'all' && (p.reviewerName ?? 'Anonymous') !== reviewer) return false
      if (groupPinIds && !groupPinIds.has(p.id)) return false
      return true
    })
    const time = (p: PinWithComment) => new Date(p.createdAt).getTime()
    if (sort === 'oldest') list.sort((a, b) => time(a) - time(b))
    else if (sort === 'page') list.sort((a, b) => a.url.localeCompare(b.url) || time(b) - time(a))
    else list.sort((a, b) => time(b) - time(a))
    return list
  }, [allPins, status, page, reviewer, groupPinIds, sort])

  const selected = selectedId ? allPins.find((p) => p.id === selectedId) ?? null : null
  const openCount = allPins.filter((p) => p.status === 'open').length
  const resolvedCount = allPins.length - openCount
  const newest = allPins.reduce<string | null>(
    (acc, p) => (!acc || new Date(p.createdAt) > new Date(acc) ? p.createdAt : acc),
    null,
  )

  const select = useCallback(
    (id: string | null) => {
      void navigate({
        to: '/projects/$id/inbox',
        params: { id: project.id },
        search: id ? { pin: id } : {},
        replace: true,
      })
    },
    [navigate, project.id],
  )

  // Keep the selected row in view when moving with the keyboard.
  useEffect(() => {
    if (!selectedId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-pin-id="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const setPinStatus = useCallback(
    async (pinId: string, next: 'open' | 'resolved') => {
      await updatePinStatus({ data: { projectId: project.id, pinId, status: next } })
      await router.invalidate()
    },
    [project.id, router],
  )

  // Keyboard: j/k move, Enter opens, r resolves, a replies, x checks, Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.altKey) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setChecked(new Set(visible.map((p) => p.id)))
        return
      }
      if (e.metaKey || e.ctrlKey) return
      const index = selectedId ? visible.findIndex((p) => p.id === selectedId) : -1
      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault()
          const next = visible[Math.min(visible.length - 1, index + 1)]
          if (next) select(next.id)
          break
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          const prev = visible[Math.max(0, index - 1)]
          if (prev) select(prev.id)
          break
        }
        case 'Enter': {
          if (!selected) break
          if (!window.matchMedia('(min-width: 1024px)').matches) {
            void navigate({ to: '/projects/$id/pins/$pinId', params: { id: project.id, pinId: selected.id } })
          }
          break
        }
        case 'r': {
          if (!selected) break
          e.preventDefault()
          void setPinStatus(selected.id, selected.status === 'resolved' ? 'open' : 'resolved').then(() =>
            setLive(selected.status === 'resolved' ? 'Pin reopened' : 'Pin resolved'),
          )
          break
        }
        case 'a': {
          if (!selected) break
          e.preventDefault()
          composerRef.current?.focus()
          break
        }
        case 'x': {
          if (!selected) break
          e.preventDefault()
          setChecked((prev) => {
            const next = new Set(prev)
            if (next.has(selected.id)) next.delete(selected.id)
            else next.add(selected.id)
            return next
          })
          break
        }
        case 'Escape': {
          if (checked.size > 0) setChecked(new Set())
          else if (selectedId) select(null)
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, selectedId, selected, select, navigate, project.id, setPinStatus, checked.size])

  const bulk = async (next: 'open' | 'resolved') => {
    const ids = [...checked]
    if (ids.length === 0) return
    await bulkUpdatePinStatus({ data: { projectId: project.id, pinIds: ids, status: next } })
    setChecked(new Set())
    setLive(`${ids.length} ${ids.length === 1 ? 'pin' : 'pins'} ${next === 'resolved' ? 'resolved' : 'reopened'}`)
    await router.invalidate()
  }

  const analyze = async () => {
    setAnalyzing(true)
    setAiError(null)
    try {
      await analyzeProjectPins({ data: { projectId: project.id } })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
      await router.invalidate()
    }
  }

  const copyForAgent = (group: AiGroupSummary) => {
    const byId = new Map(allPins.map((p) => [p.id, p]))
    const groupPins = group.pinIds
      .map((id) => byId.get(id))
      .filter((p): p is PinWithComment => Boolean(p))
      .map((p) => ({
        id: p.id,
        url: p.url,
        comment: p.comment,
        reviewerName: p.reviewerName,
        selector: p.selector,
        xpath: p.xpath,
        tackId: p.tackId,
        elementText: p.elementText,
        elementStyles: p.elementStyles,
        browser: p.browser,
        os: p.os,
        xPct: p.xPct,
        yPct: p.yPct,
        viewportW: p.viewportW,
        viewportH: p.viewportH,
        screenshotUrl: p.screenshotPath
          ? `${project.appOrigin}/api/screenshots/${project.projectKey}/${p.id}`
          : null,
      }))
    void navigator.clipboard?.writeText(buildAgentPrompt(group, groupPins))
    setCopiedGroupId(group.id)
    setLive('Brief copied for your agent')
    setTimeout(() => setCopiedGroupId(null), 2000)
  }

  const hasPins = allPins.length > 0
  const filtersActive = page !== 'all' || reviewer !== 'all' || groupId !== null

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      activeSection="inbox"
      userEmail={userEmail}
    >
      <div className="sr-only" role="status" aria-live="polite">{live}</div>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-page-title">Inbox</h1>
          <p className="mt-1 text-sm text-[var(--ink-mute)]">
            {hasPins
              ? `${openCount} open · ${resolvedCount} resolved${newest ? ` · last pin ${getTimeAgo(newest)}` : ''}`
              : 'No feedback yet.'}
          </p>
        </div>
        {hasPins && (
          <div className="flex flex-wrap items-center gap-2">
            {project.previewUrl && (
              <Button href={project.previewUrl} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                Open preview
              </Button>
            )}
            {aiEntitlement.entitled && (
              <Button size="sm" onClick={analyze} disabled={analyzing || openCount === 0}>
                <ListChecks size={14} strokeWidth={1.8} aria-hidden="true" />
                {analyzing ? 'Analyzing…' : 'Analyze'}
              </Button>
            )}
          </div>
        )}
      </header>

      {!hasPins ? (
        <InboxEmpty projectId={project.id} connected={project.connected} />
      ) : (
        <div className="grid gap-6 lg:h-[calc(100vh-9.5rem)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* List */}
          <section className="flex min-h-0 min-w-0 flex-col" aria-label="Pins">
            <AiGroups
              aiInbox={aiInbox}
              activeGroupId={groupId}
              onFilterGroup={setGroupId}
              onCopyForAgent={copyForAgent}
              copiedGroupId={copiedGroupId}
              error={aiError}
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--line)] pb-2">
              <Tabs<StatusFilter>
                ariaLabel="Filter by status"
                value={status}
                onChange={setStatus}
                items={[
                  { value: 'open', label: 'Open', count: openCount },
                  { value: 'resolved', label: 'Resolved', count: resolvedCount },
                  { value: 'all', label: 'All' },
                ]}
              />
              {pages.length > 1 && (
                <Select
                  ariaLabel="Filter by page"
                  label="Page"
                  value={page}
                  onChange={setPage}
                  options={[{ value: 'all', label: 'all' }, ...pages.map((p) => ({ value: p, label: p }))]}
                />
              )}
              {reviewers.length > 1 && (
                <Select
                  ariaLabel="Filter by reviewer"
                  label="From"
                  value={reviewer}
                  onChange={setReviewer}
                  options={[{ value: 'all', label: 'all' }, ...reviewers.map((r) => ({ value: r, label: r }))]}
                />
              )}
              <Select<SortOrder>
                ariaLabel="Sort order"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest', label: 'newest first' },
                  { value: 'oldest', label: 'oldest first' },
                  { value: 'page', label: 'by page' },
                ]}
              />
            </div>

            {checked.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] px-2 py-1.5 text-xs">
                <span className="font-mono text-[var(--ink)]">{checked.size} selected</span>
                <Button size="sm" onClick={() => void bulk('resolved')}>Resolve</Button>
                <Button size="sm" variant="secondary" onClick={() => void bulk('open')}>Reopen</Button>
                <button
                  type="button"
                  onClick={() => setChecked(new Set())}
                  className="ml-auto font-mono text-[11px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                >
                  clear
                </button>
              </div>
            )}

            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--ink-mute)]">
                {filtersActive ? 'No pins match these filters.' : status === 'open' ? 'Nothing open. Nice.' : 'No pins here.'}
              </p>
            ) : (
              <ol ref={listRef} className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
                {visible.map((p) => (
                  <PinListRow
                    key={p.id}
                    projectId={project.id}
                    projectKey={project.projectKey}
                    pin={p}
                    number={numberById.get(p.id) ?? 0}
                    selected={p.id === selectedId}
                    checked={checked.has(p.id)}
                    selecting={checked.size > 0}
                    onSelect={select}
                    onToggleChecked={(id, on) =>
                      setChecked((prev) => {
                        const next = new Set(prev)
                        if (on) next.add(id)
                        else next.delete(id)
                        return next
                      })
                    }
                  />
                ))}
              </ol>
            )}
            <p className="hidden pt-2 text-[11px] font-mono text-[var(--ink-soft)] lg:block">
              j/k move · r resolve · a reply · x select · ⌘A all · esc clear
            </p>
          </section>

          {/* Pane */}
          <section className="hidden min-h-0 min-w-0 lg:block" aria-label="Selected pin">
            {selected ? (
              <div className="h-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-5">
                <PinPanel
                  previewUrl={project.previewUrl}
                  projectKey={project.projectKey}
                  pin={selected}
                  number={numberById.get(selected.id)}
                  variant="pane"
                  onClose={() => select(null)}
                  composerRef={composerRef}
                  onUpdateStatus={(next) => setPinStatus(selected.id, next)}
                  onAddReply={async (body) => {
                    await addOwnerReply({ data: { projectId: project.id, pinId: selected.id, body } })
                    await router.invalidate()
                  }}
                  onDelete={async () => {
                    await deleteProjectPin({ data: { projectId: project.id, pinId: selected.id } })
                    select(null)
                    await router.invalidate()
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[14px] border border-dashed border-[var(--line)] p-8 text-center">
                <p className="max-w-xs text-sm text-[var(--ink-mute)]">
                  Pick a pin on the left, or press <kbd className="rounded border border-[var(--line)] px-1 font-mono text-[11px]">j</kbd> to start at the top.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  )
}

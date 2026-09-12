import { Bookmark, Code2 } from 'lucide-react'

export function FilterControls({
  openCount,
  resolvedCount,
  statusFilter,
  onChange,
}: {
  openCount: number
  resolvedCount: number
  statusFilter: 'all' | 'open' | 'resolved'
  onChange: (filter: 'all' | 'open' | 'resolved') => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Filter pins"
    >
      {(['all', 'open', 'resolved'] as const).map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={statusFilter === filter}
          onClick={() => onChange(filter)}
          className={`min-h-11 rounded px-3 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
            statusFilter === filter
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
          }`}
        >
          {filter}
          {filter !== 'all' && (
            <span className="ml-1 text-[var(--ink-mute)]">
              {filter === 'open' ? openCount : resolvedCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function InstallModeTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: 'snippet' | 'bookmarklet'
  onTabChange: (tab: 'snippet' | 'bookmarklet') => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Choose install method"
    >
      <button
        type="button"
        aria-pressed={activeTab === 'snippet'}
        onClick={() => onTabChange('snippet')}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2.5 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
          activeTab === 'snippet'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
            : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
        }`}
      >
        <Code2 size={13} strokeWidth={1.8} aria-hidden="true" />
        Script
      </button>
      <button
        type="button"
        aria-pressed={activeTab === 'bookmarklet'}
        onClick={() => onTabChange('bookmarklet')}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2.5 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
          activeTab === 'bookmarklet'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
            : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
        }`}
      >
        <Bookmark size={13} strokeWidth={1.8} aria-hidden="true" />
        Quick pass
      </button>
    </div>
  )
}

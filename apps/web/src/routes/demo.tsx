import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo')({
  component: DemoPage,
  head: () => ({
    scripts: [
      {
        src: '/tack-widget.js',
        'data-project': 'REPLACE_WITH_PROJECT_KEY',
        'data-api': '',
      },
    ],
  }),
})

function DemoPage() {
  return (
    <main className="min-h-screen bg-[var(--page)] text-[var(--ink)] p-8">
      <div className="max-w-3xl mx-auto">
        <nav className="flex items-center justify-between mb-16 pb-4 border-b border-[var(--line)]">
          <span className="font-semibold">acme.com</span>
          <div className="flex gap-6 text-sm text-[var(--ink-soft)]">
            <span>Features</span>
            <span>Pricing</span>
            <span>About</span>
          </div>
        </nav>

        <section className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight mb-4">
            Ship faster with<br />
            <span className="text-[var(--accent)]">visual feedback.</span>
          </h1>
          <p className="text-lg text-[var(--ink-soft)] max-w-lg mb-8">
            Click the coral pin button in the bottom-right corner to try Tack.
            Enter pin mode, click any element, and leave a comment.
          </p>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-[var(--accent)] text-[var(--on-accent)] rounded-full text-sm font-medium">
              Get started
            </button>
            <button className="px-5 py-2.5 border border-[var(--line)] rounded-full text-sm text-[var(--ink)]">
              Learn more
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {['Pin feedback', 'Track progress', 'Ship fixes'].map((title) => (
            <div
              key={title}
              className="p-6 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
            >
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                A short description of this feature that explains the value.
              </p>
            </div>
          ))}
        </section>

        <footer className="pt-8 border-t border-[var(--line)] text-sm text-[var(--ink-soft)]">
          This is a demo page. The Tack widget is loaded on this page.
        </footer>
      </div>

      <script src="/tack-widget.js" data-project="REPLACE_WITH_PROJECT_KEY" />
    </main>
  )
}

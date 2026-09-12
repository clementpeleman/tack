import { Link } from '@tanstack/react-router'
import { buttonClasses } from '#/components/ui/Button'

/**
 * Zero pins: one sentence, one primary action. The review link is the
 * fastest route to a first pin because it needs no change to the site.
 */
export function InboxEmpty({ projectId, connected }: { projectId: string; connected: boolean }) {
  return (
    <div className="max-w-md py-10">
      <h2 className="font-display text-[20px] font-bold text-[var(--ink)]">
        {connected ? 'No feedback yet' : 'Nothing here yet'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-mute)]">
        {connected
          ? 'The widget is live on your preview. Pins appear here the moment a reviewer leaves one.'
          : 'Create a review link and send it to your client. They see the site with the widget on it; nothing to install.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/projects/$id/connect"
          params={{ id: projectId }}
          search={{ onboarding: false }}
          className={buttonClasses('primary', 'md')}
        >
          {connected ? 'Open connect page' : 'Create a review link'}
        </Link>
        {!connected && (
          <Link
            to="/projects/$id/connect"
            params={{ id: projectId }}
            search={{ onboarding: false }}
            className="text-sm text-[var(--ink-mute)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            or install the script
          </Link>
        )}
      </div>
    </div>
  )
}

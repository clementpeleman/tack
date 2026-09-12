import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Layout } from '#/components/Layout'
import { PinPanel } from '#/components/PinPanel'
import {
  addOwnerReply,
  deleteProjectPin,
  getPinDetail,
  updatePinStatus,
} from '#/lib/project-pin-actions'
import { getCurrentUser } from '#/lib/user'

/**
 * One pin on its own page. Wide screens open pins in the inbox pane; this
 * route serves small screens, notification links and old bookmarks.
 */
export const Route = createFileRoute('/projects/$id/pins/$pinId')({
  component: PinDetailPage,
  loader: async ({ params }) => {
    const [data, user] = await Promise.all([
      getPinDetail({ data: { projectId: params.id, pinId: params.pinId } }),
      getCurrentUser(),
    ])
    return { ...data, userEmail: user.email }
  },
})

function PinDetailPage() {
  const { project, pin, sidebarProjects, userEmail } = Route.useLoaderData()
  const router = useRouter()

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      activeSection="inbox"
      userEmail={userEmail}
    >
      <div className="max-w-2xl">
        <Link
          to="/projects/$id/inbox"
          params={{ id: project.id }}
          search={{ pin: pin.id }}
          className="mb-4 inline-block text-meta no-underline hover:text-[var(--ink-mute)]"
        >
          ← Inbox
        </Link>
        <PinPanel
          previewUrl={project.previewUrl}
          projectKey={project.projectKey}
          pin={pin}
          variant="page"
          onUpdateStatus={async (status) => {
            await updatePinStatus({ data: { projectId: project.id, pinId: pin.id, status } })
            await router.invalidate()
          }}
          onAddReply={async (body) => {
            await addOwnerReply({ data: { projectId: project.id, pinId: pin.id, body } })
            await router.invalidate()
          }}
          onDelete={async () => {
            await deleteProjectPin({ data: { projectId: project.id, pinId: pin.id } })
            await router.navigate({ to: '/projects/$id/inbox', params: { id: project.id } })
          }}
        />
      </div>
    </Layout>
  )
}

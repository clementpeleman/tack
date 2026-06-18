import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Layout } from '#/components/Layout'
import { PinDetail } from '#/components/PinDetail'
import {
  addOwnerReply,
  deleteProjectPin,
  getPinDetail,
  updatePinStatus,
} from '#/lib/project-pin-actions'

export const Route = createFileRoute('/projects/$id/pins/$pinId')({
  component: PinDetailPage,
  loader: ({ params }) =>
    getPinDetail({
      data: { projectId: params.id, pinId: params.pinId },
    }),
})

function PinDetailPage() {
  const { project, pin, sidebarProjects } = Route.useLoaderData()
  const router = useRouter()

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
    >
      <PinDetail
        projectId={project.id}
        previewUrl={project.previewUrl}
        projectKey={project.projectKey}
        pin={pin}
        onDelete={async () => {
          await deleteProjectPin({
            data: { projectId: project.id, pinId: pin.id },
          })
          await router.navigate({
            to: '/projects/$id/inbox',
            params: { id: project.id },
          })
        }}
        onUpdateStatus={async (status) => {
          await updatePinStatus({
            data: { projectId: project.id, pinId: pin.id, status },
          })
          await router.invalidate()
        }}
        onAddReply={async (body) => {
          await addOwnerReply({
            data: { projectId: project.id, pinId: pin.id, body },
          })
          await router.invalidate()
        }}
      />
    </Layout>
  )
}

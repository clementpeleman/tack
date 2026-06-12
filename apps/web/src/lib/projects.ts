import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireAuth } from '#/lib/auth'
import { generateProjectKey } from '#/lib/project-key'
import type { ProjectNotifySettings } from '#/lib/notifications'

export const getProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    return db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
  },
)

export const getProject = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })
    return project
  })

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; previewUrl: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .insert(projects)
      .values({
        userId,
        name: data.name,
        previewUrl: data.previewUrl,
        projectKey: generateProjectKey(),
      })
      .returning()

    return project
  })

export const updateProjectSettings = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; settings: ProjectNotifySettings }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    await db
      .update(projects)
      .set({ settings: data.settings })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

export const updateProjectDetails = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; name: string; previewUrl: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    await db
      .update(projects)
      .set({
        name: data.name.trim(),
        previewUrl: data.previewUrl.trim(),
      })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

export const archiveProject = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; confirmName: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })
    if (project.name !== data.confirmName.trim()) {
      throw new Error('Project name does not match')
    }

    await db
      .update(projects)
      .set({ archivedAt: new Date().toISOString() })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

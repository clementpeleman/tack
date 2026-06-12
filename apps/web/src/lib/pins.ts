import { db } from '#/db/index'
import {
  aiGroupPins,
  aiPinInsights,
  notifications,
  pins,
  replies,
  users,
} from '#/db/schema'
import { eq, inArray, asc, desc } from 'drizzle-orm'
import { deleteScreenshot } from '#/lib/storage'

type PinRow = typeof pins.$inferSelect
type ReplyRow = typeof replies.$inferSelect

export type PinWithComment = PinRow & {
  comment: string | null
  firstReplyId: string | null
}

export interface EnrichedReply {
  id: string
  authorType: 'owner' | 'reviewer'
  authorName: string
  body: string
  createdAt: string
}

export async function enrichPinsWithComments(
  pinRows: PinRow[],
): Promise<PinWithComment[]> {
  if (pinRows.length === 0) return []

  const pinIds = pinRows.map((p) => p.id)
  const allReplies = await db
    .select()
    .from(replies)
    .where(inArray(replies.pinId, pinIds))
    .orderBy(asc(replies.createdAt))

  const firstByPin = new Map<string, { id: string; body: string }>()
  for (const reply of allReplies) {
    if (!firstByPin.has(reply.pinId)) {
      firstByPin.set(reply.pinId, { id: reply.id, body: reply.body })
    }
  }

  return pinRows.map((pin) => {
    const first = firstByPin.get(pin.id)
    return {
      ...pin,
      comment: first?.body ?? null,
      firstReplyId: first?.id ?? null,
    }
  })
}

export async function getRepliesForPin(pinId: string): Promise<ReplyRow[]> {
  return db
    .select()
    .from(replies)
    .where(eq(replies.pinId, pinId))
    .orderBy(asc(replies.createdAt))
}

export async function enrichRepliesForPin(
  pin: Pick<PinRow, 'id' | 'reviewerId' | 'reviewerName'>,
  ownerDisplayName = 'Owner',
): Promise<EnrichedReply[]> {
  const rows = await getRepliesForPin(pin.id)
  return rows.map((reply) => ({
    id: reply.id,
    authorType: reply.authorType,
    authorName:
      reply.authorType === 'owner'
        ? ownerDisplayName
        : pin.reviewerName ?? 'Anonymous',
    body: reply.body,
    createdAt: reply.createdAt,
  }))
}

export async function addPinReply(data: {
  pinId: string
  authorType: 'owner' | 'reviewer'
  authorId: string
  body: string
}) {
  const [reply] = await db
    .insert(replies)
    .values({
      pinId: data.pinId,
      authorType: data.authorType,
      authorId: data.authorId,
      body: data.body,
    })
    .returning()
  return reply
}

export async function getOwnerDisplayName(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user?.name ?? user?.email ?? 'Owner'
}

export async function deletePinAndRelated(pinId: string) {
  const [pin] = await db.select().from(pins).where(eq(pins.id, pinId))
  if (pin?.screenshotPath) {
    await deleteScreenshot(pin.projectId, pinId)
  }
  await db.delete(notifications).where(eq(notifications.pinId, pinId))
  await db.delete(replies).where(eq(replies.pinId, pinId))
  await db.delete(aiPinInsights).where(eq(aiPinInsights.pinId, pinId))
  await db.delete(aiGroupPins).where(eq(aiGroupPins.pinId, pinId))
  await db.delete(pins).where(eq(pins.id, pinId))
}

export async function updatePinFirstComment(
  pinId: string,
  comment: string,
  reviewerName?: string | null,
) {
  const [firstReply] = await db
    .select()
    .from(replies)
    .where(eq(replies.pinId, pinId))
    .orderBy(asc(replies.createdAt))
    .limit(1)

  if (firstReply) {
    await db
      .update(replies)
      .set({ body: comment })
      .where(eq(replies.id, firstReply.id))
  }

  if (reviewerName !== undefined) {
    await db
      .update(pins)
      .set({ reviewerName: reviewerName || null })
      .where(eq(pins.id, pinId))
  }
}

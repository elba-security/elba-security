import { eq } from 'drizzle-orm';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable } from '@/database/schema';

export const channelDeleteHandler: TeamsEventHandler = async ({ channelId }) => {
  await db.update(channelsTable).set({ isDeleted: true }).where(eq(channelsTable.id, channelId));

  return { message: 'channel was deleted' };
};

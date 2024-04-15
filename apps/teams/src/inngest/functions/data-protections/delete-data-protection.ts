import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { deleteMessage } from '@/connectors/microsoft/messages/messages';
import { decrypt } from '@/common/crypto';
import { deleteReply } from '@/connectors/microsoft/replies/replies';

export const deleteDataProtection = inngest.createFunction(
  {
    id: 'delete-data-protection',
    retries: env.DELETE_DATA_PROTECTION_MAX_RETRY,
  },
  { event: 'teams/data.protection.delete.triggered' },
  async ({ event }) => {
    const { organisationId, metadata } = event.data;

    const { messageId, channelId, teamId, replyId } = metadata;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new Error(`Could not retrieve organisation with organisationId=${organisationId}`);
    }

    if (metadata.type === 'message') {
      await deleteMessage({
        token: await decrypt(organisation.token),
        teamId,
        channelId,
        messageId,
      });
    }

    if (metadata.type === 'reply' && replyId) {
      await deleteReply({
        token: await decrypt(organisation.token),
        teamId,
        channelId,
        messageId,
        replyId,
      });
    }
  }
);

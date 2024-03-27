import { eq } from 'drizzle-orm';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { deleteMessage } from '@/connectors/microsoft/messages/messages';
import { deleteReply } from '@/connectors/microsoft/replies/replies';
import { decrypt } from '@/common/crypto';

export const deleteDataProtectionObject = async (data: ElbaPayload) => {
  const [organisation] = await db
    .select({
      token: organisationsTable.token,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, data.organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve organisation with organisationId=${data.organisationId}`);
  }

  if (data.metadata.type === 'message') {
    await deleteMessage({
      token: await decrypt(organisation.token),
      teamId: data.metadata.organisationId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
    });
  }

  if (data.metadata.type === 'reply' && data.metadata.replyId) {
    await deleteReply({
      token: await decrypt(organisation.token),
      teamId: data.metadata.organisationId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
      replyId: data.metadata.replyId,
    });
  }
};

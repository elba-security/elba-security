import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getReply } from '@/connectors/microsoft/replies/replies';
import { decrypt } from '@/common/crypto';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';

export const fetchDataProtectionContent = async (data: ElbaPayload) => {
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
    return getMessage({
      token: await decrypt(organisation.token),
      teamId: data.metadata.teamId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
    });
  }

  if (data.metadata.replyId) {
    return getReply({
      token: await decrypt(organisation.token),
      teamId: data.metadata.teamId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
      replyId: data.metadata.replyId,
    });
  }
};

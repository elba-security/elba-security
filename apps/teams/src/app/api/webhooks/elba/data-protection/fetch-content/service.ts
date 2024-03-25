import { NonRetriableError } from 'inngest';
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
    throw new NonRetriableError(
      `Could not retrieve organisation with organisationId=${data.organisationId}`
    );
  }

  if (data.metadata.type === 'message') {
    const message = await getMessage({
      token: await decrypt(organisation.token),
      teamId: data.metadata.teamId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
    });

    if (!message || message.messageType !== 'message') {
      return;
    }

    return message;
  }

  if (data.metadata.replyId) {
    const reply = await getReply({
      token: await decrypt(organisation.token),
      teamId: data.metadata.teamId,
      channelId: data.metadata.channelId,
      messageId: data.metadata.messageId,
      replyId: data.metadata.replyId,
    });

    if (!reply || reply.messageType !== 'message') {
      return;
    }

    return reply;
  }
};

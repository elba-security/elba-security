import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getReply } from '@/connectors/microsoft/replies/replies';
import { decrypt } from '@/common/crypto';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const fetchDataProtectionContent = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: unknown;
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);

  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  const { teamId, channelId, messageId, replyId } = messageMetadataResult.data;

  const [organisation] = await db
    .select({
      token: organisationsTable.token,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve organisation with organisationId=${organisationId}`);
  }

  if (messageMetadataResult.data.type === 'message') {
    return getMessage({
      token: await decrypt(organisation.token),
      teamId,
      channelId,
      messageId,
    });
  }

  if (replyId) {
    return getReply({
      token: await decrypt(organisation.token),
      teamId,
      channelId,
      messageId,
      replyId,
    });
  }
};

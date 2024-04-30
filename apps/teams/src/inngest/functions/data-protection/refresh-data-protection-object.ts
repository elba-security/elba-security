import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import { decrypt } from '@/common/crypto';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';
import { getReply } from '@/connectors/microsoft/replies/replies';

export const refreshDataProtectionObject = inngest.createFunction(
  {
    id: 'teams-refresh-data-protection-object',
    retries: env.REFRESH_DATA_PROTECTION_MAX_RETRY,
  },
  { event: 'teams/data_protection.refresh_object.requested' },
  async ({ event }) => {
    const { organisationId, metadata } = event.data;

    const { messageId, channelId, teamId, replyId } = metadata;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new Error(`Could not retrieve organisation with organisationId=${organisationId}`);
    }

    const elbaClient = createElbaClient(organisationId, organisation.region);

    if (metadata.type === 'message') {
      const message = await getMessage({
        token: await decrypt(organisation.token),
        teamId,
        channelId,
        messageId,
      });

      if (!message) {
        await elbaClient.dataProtection.deleteObjects({
          ids: [`${organisationId}:${messageId}`],
        });
        return;
      }

      const [channel] = await db
        .select({
          id: channelsTable.id,
          displayName: channelsTable.displayName,
          membershipType: channelsTable.membershipType,
        })
        .from(channelsTable)
        .where(eq(channelsTable.id, `${organisationId}:${channelId}`));

      if (!channel) {
        throw new Error(`Could not retrieve channel with id=${organisationId}:${channelId}`);
      }

      const object = formatDataProtectionObject({
        teamId,
        messageId,
        channelId,
        organisationId,
        channelName: channel.displayName,
        membershipType: channel.membershipType,
        message,
      });

      await elbaClient.dataProtection.updateObjects({ objects: [object] });
    }

    if (replyId) {
      const reply = await getReply({
        token: await decrypt(organisation.token),
        teamId,
        channelId,
        messageId,
        replyId,
      });

      if (!reply) {
        await elbaClient.dataProtection.deleteObjects({
          ids: [`${organisationId}:${replyId}`],
        });

        return;
      }

      const [channel] = await db
        .select({
          id: channelsTable.id,
          displayName: channelsTable.displayName,
          membershipType: channelsTable.membershipType,
        })
        .from(channelsTable)
        .where(eq(channelsTable.id, `${organisationId}:${channelId}`));

      if (!channel) {
        throw new Error(`Could not retrieve channel with id=${organisationId}:${channelId}`);
      }

      const object = formatDataProtectionObject({
        teamId,
        messageId,
        channelId,
        replyId: reply.id,
        channelName: channel.displayName,
        organisationId,
        membershipType: channel.membershipType,
        message: reply,
      });

      await elbaClient.dataProtection.updateObjects({ objects: [object] });
    }
  }
);

import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { channelsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';

export const messageUpsert = inngest.createFunction(
  {
    id: 'teams-data-protection-object-upsert-requested',
    retries: env.TEAMS_SYNC_MAX_RETRY,
  },
  { event: 'teams/data.protection.object.upsert.requested' },
  async ({ event, step }) => {
    const { organisationId, region, teamId, teamName, channelId, messageId, replyId, message } =
      event.data;

    const [channel] = await step.run('get-channel', async () =>
      db
        .select({
          id: channelsTable.id,
          displayName: channelsTable.displayName,
          membershipType: channelsTable.membershipType,
        })
        .from(channelsTable)
        .where(
          and(eq(channelsTable.id, channelId), eq(channelsTable.organisationId, organisationId))
        )
    );

    if (!channel) {
      throw new NonRetriableError(
        `Could not retrieve channel - ${channelId} within organisation - ${organisationId}`
      );
    }

    const elbaClient = createElbaClient(organisationId, region);

    const object = formatDataProtectionObject({
      teamId,
      teamName,
      messageId,
      channelId,
      channelName: channel.displayName,
      organisationId,
      membershipType: channel.membershipType,
      replyId,
      message,
    });

    await step.run('upsert-message-to-elba', async () => {
      await elbaClient.dataProtection.updateObjects({ objects: [object] });
    });
  }
);

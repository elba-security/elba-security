import { eq, sql } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getChannels } from '@/connectors/microsoft/channels/channels';

export const syncChannels = inngest.createFunction(
  {
    id: 'teams-sync-channels',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    onFailure: async ({ event, step }) => {
      const { organisationId, teamId } = event.data.event.data;

      await step.sendEvent('channels-sync-complete', {
        name: 'teams/channels.sync.completed',
        data: {
          teamId,
          organisationId,
        },
      });
    },
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.CHANNELS_SYNC_MAX_RETRY,
  },
  { event: 'teams/channels.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, teamId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { validChannels: channels } = await step.run('paginate', async () => {
      const { validChannels, invalidChannels } = await getChannels({
        token: await decrypt(organisation.token),
        teamId,
      });

      if (invalidChannels.length > 0) {
        logger.warn('Retrieved channels contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidChannels,
        });
      }

      return { validChannels };
    });

    await step.run('insert-channels-to-db', async () => {
      const channelsToInsert = channels.map((channel) => ({
        organisationId,
        id: `${organisationId}:${channel.id}`,
        membershipType: channel.membershipType,
        displayName: channel.displayName,
        channelId: channel.id,
      }));

      await db
        .insert(channelsTable)
        .values(channelsToInsert)
        .onConflictDoUpdate({
          target: [channelsTable.id],
          set: {
            displayName: sql`excluded.display_name`,
          },
        });
    });

    if (channels.length) {
      await step.sendEvent(
        'subscribe-to-channel-messages',
        channels.map((channel) => ({
          name: 'teams/channel.subscription.requested',
          data: {
            uniqueChannelInOrganisationId: `${organisationId}:${channel.id}`,
            organisationId,
            channelId: channel.id,
            teamId,
          },
        }))
      );

      const eventsWait = channels.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-messages-complete-${id}`, {
          event: 'teams/messages.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.channelId == '${id}'`,
        });
      });

      await step.sendEvent(
        'start-messages-sync',
        channels.map((channel) => ({
          name: 'teams/messages.sync.requested',
          data: {
            channelId: channel.id,
            organisationId,
            teamId,
            channelName: channel.displayName,
            membershipType: channel.membershipType,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    await step.sendEvent('channels-sync-complete', {
      name: 'teams/channels.sync.completed',
      data: {
        teamId,
        organisationId,
      },
    });

    return {
      status: 'completed',
    };
  }
);

import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getChannels } from '@/connectors/microsoft/channels/channels';

export const syncChannels = inngest.createFunction(
  {
    id: 'sync-channels',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.CHANNELS_SYNC_MAX_RETRY,
  },
  { event: 'teams/channels.sync.triggered' },
  async ({ event, step }) => {
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

    const { validChannels } = await step.run('paginate', async () => {
      const result = await getChannels({
        token: await decrypt(organisation.token),
        teamId,
      });

      if (result.invalidChannels.length > 0) {
        logger.warn('Retrieved channels contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidChannels: result.invalidChannels,
        });
      }

      return result;
    });

    if (validChannels.length) {
      const eventsWait = validChannels.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-messages-complete-${id}`, {
          event: 'teams/messages.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.channelId == '${id}'`,
        });
      });

      await step.sendEvent(
        'start-messages-sync',
        validChannels.map((channel) => ({
          name: 'teams/messages.sync.triggered',
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

import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getTeams } from '@/connectors/microsoft/teams/teams';
import { createElbaClient } from '@/connectors/elba/client';

export const syncTeams = inngest.createFunction(
  {
    id: 'sync-teams',
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
    retries: env.TEAMS_SYNC_MAX_RETRY,
  },
  { event: 'teams/teams.sync.triggered' },
  async ({ event, step }) => {
    const { organisationId, skipToken, syncStartedAt } = event.data;

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

    const { validTeams: teams, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getTeams({
        token: await decrypt(organisation.token),
        skipToken,
      });

      if (result.invalidTeams.length > 0) {
        logger.warn('Retrieved teams contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidTeams: result.invalidTeams,
        });
      }

      return result;
    });

    if (teams.length) {
      const eventsWait = teams.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-channels-complete-${id}`, {
          event: 'teams/channels.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.teamId == '${id}'`,
        });
      });

      await step.sendEvent(
        'start-channels-sync',
        teams.map(({ id }) => ({
          name: 'teams/channels.sync.triggered',
          data: {
            teamId: id,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-teams-page', {
        name: 'teams/teams.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    const elbaClient = createElbaClient(organisationId, organisation.region);
    await elbaClient.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });

    return {
      status: 'completed',
    };
  }
);

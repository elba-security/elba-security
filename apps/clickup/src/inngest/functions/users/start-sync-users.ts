import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { getTeamIds } from '@/connectors/clickup/team';
import { decrypt } from '@/common/crypto';

export const syncUsers = inngest.createFunction(
    {
      id: 'clickup-sync-users',
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      retries: 5,
      cancelOn: [
        {
          event: 'clickup/elba_app.uninstalled',
          match: 'data.organisationId',
        },
      ],
    },
    { event: 'clickup/users.sync.requested' },
    async ({ event, step }) => {
      const { organisationId, syncStartedAt } = event.data;
  
      const organisation = await step.run('get-organisation', async () => {
        const [result] = await db
          .select({
            accessToken: Organisation.accessToken,
            region: Organisation.region,
          })
          .from(Organisation)
          .where(eq(Organisation.id, organisationId));
        if (!result) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }
        return result;
      });
  
      const elba = createElbaClient({ organisationId, region: organisation.region });
      const token = await decrypt(organisation.accessToken);

      const teamIds = await step.run('get-team-ids', async () => {
        const result = await getTeamIds(token);
        return result
      });
  
      // Process each team one by one
      for (const teamId of teamIds) {
        await step.sendEvent('sync-users-page', {
          name: 'clickup/users.page_sync.requested',
          data: {
            organisationId,
            region: organisation.region,
            page: 0,
            teamId,
          },
        });
  
        // Wait for the sync to complete for the current team
        await step.waitForEvent(`wait-sync-team-users`, {
          event: 'clickup/users.team_sync.completed',
          timeout: '1 day',
          if: `event.data.organisationId == '${organisationId}' && event.data.teamId == '${teamId}'`,
        });
      }
  
      // Delete the elba users that have been sent before this sync
      await step.run('finalize', () =>
        elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
      );
  
      return {
        status: 'completed',
      };
    }
  );
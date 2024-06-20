/* eslint-disable no-await-in-loop */
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { getOrganizationIds } from '@/connectors/make/organizations';
import { decrypt } from '@/common/crypto';

export const syncUsers = inngest.createFunction(
    {
      id: 'make-sync-users',
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      retries: 5,
      cancelOn: [
        {
          event: 'make/elba_app.uninstalled',
          match: 'data.organisationId',
        },
      ],
    },
    { event: 'make/users.sync.requested' },
    async ({ event, step }) => {
      const { organisationId, syncStartedAt } = event.data;

      const organisation = await step.run('get-organisation', async () => {
        const [result] = await db
          .select({
            accessToken: Organisation.token,
            region: Organisation.region,
            zoneDomain: Organisation.zoneDomain
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

      const organizationIds = await step.run('get-organization-ids', async () => {
        const result = await getOrganizationIds(token,organisation.zoneDomain);
        return result
      });
  
      for (const organizationId of organizationIds) {
        await step.sendEvent('sync-users-page', {
          name: 'make/users.page_sync.requested',
          data: {
            organisationId,
            region: organisation.region,
            isFirstSync: false,
            syncStartedAt,
            page: 0,
            sourceOrganizationId: organizationId,
          },
        });
  
        // Wait for the sync to complete for the current organization
        await step.waitForEvent(`wait-sync-organization-users`, {
          event: 'make/users.organization_sync.completed',
          timeout: '1 day',
          if: `event.data.organisationId == '${organisationId}' && event.data.sourceOrganizationId == '${organizationId}'`,
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
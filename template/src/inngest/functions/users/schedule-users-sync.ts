import { elbaRegions } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { createElbaGlobalClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';

/**
 * Schedules periodic user synchronization for all organizations.
 * This function:
 * 1. Runs on a cron schedule defined in env.SYNC_CRON
 * 2. Fetches all organizations from each Elba region
 * 3. Triggers user sync for each valid organization
 * 4. Handles cases where Nango connection is missing
 */
export const scheduleUsersSync = inngest.createFunction(
  {
    id: '{{name}}-schedule-users-syncs',
    retries: 5,
  },
  { cron: env.SYNC_CRON },
  async ({ step }) => {
    // Fetch organizations from all regions in parallel
    const regionOrganisations = await Promise.all(
      elbaRegions.map((region) =>
        step.run(`get-organisations-${region}`, async () => {
          const elba = createElbaGlobalClient(region);
          const result = await elba.organisations.list();
          return result.organisations.map(({ id: organisationId, nangoConnectionId }) => ({
            organisationId,
            nangoConnectionId,
            region,
          }));
        })
      )
    );

    // Separate organizations into valid and invalid (missing Nango connection)
    const invalidOrganisations: { organisationId: string; region: string }[] = [];
    const organisations: {
      organisationId: string;
      region: string;
      nangoConnectionId: string;
    }[] = [];

    for (const { organisationId, region, nangoConnectionId } of regionOrganisations.flat()) {
      if (!nangoConnectionId) {
        invalidOrganisations.push({ organisationId, region });
      } else {
        organisations.push({ organisationId, region, nangoConnectionId });
      }
    }

    // Trigger user sync for valid organizations
    if (organisations.length) {
      await step.sendEvent(
        'sync-users',
        organisations.map(({ organisationId, nangoConnectionId, region }) => ({
          name: '{{name}}/users.sync.requested',
          data: {
            organisationId,
            nangoConnectionId,
            region,
            syncStartedAt: Date.now(),
            isFirstSync: true,
            page: null,
          },
        }))
      );
    }

    // Log and throw error if any organizations are missing Nango connection
    if (invalidOrganisations.length) {
      logger.error('Failed to schedule users sync due to missing nango connection ID', {
        invalidOrganisations,
      });
      throw new NonRetriableError(
        'Failed to schedule users sync due to missing nango connection ID'
      );
    }

    return { organisations };
  }
);

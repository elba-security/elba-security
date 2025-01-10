import { elbaRegions } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { createElbaGlobalClient } from '@/connectors/elba/client';
import { inngest } from '../../client';

export const scheduleUsersSync = inngest.createFunction(
  { id: 'sendgrid-schedule-users-sync' },
  { cron: env.SENDGRID_USERS_SYNC_CRON },
  async ({ step }) => {
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

    if (organisations.length) {
      await step.sendEvent(
        'sendgrid-sync-users',
        organisations.map(({ organisationId, nangoConnectionId, region }) => ({
          name: 'sendgrid/users.sync.requested',
          data: {
            isFirstSync: false,
            organisationId,
            nangoConnectionId,
            region,
            syncStartedAt: Date.now(),
            page: 0,
          },
        }))
      );
    }

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

import { elbaRegions } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { createElbaGlobalClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';

export const scheduleAppsSync = inngest.createFunction(
  { id: 'dropbox-schedule-apps-sync' },
  { cron: env.DROPBOX_TPA_SYNC_CRON },
  async ({ step }) => {
    const syncStartedAt = Date.now();
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
        'sync-apps',
        organisations.map(({ organisationId, nangoConnectionId, region }) => ({
          name: 'dropbox/third_party_apps.sync.requested',
          data: {
            region,
            nangoConnectionId,
            organisationId,
            isFirstSync: false,
            syncStartedAt,
            cursor: null,
          },
        }))
      );
    }

    if (invalidOrganisations.length) {
      logger.error('Failed to schedule apps sync due to missing nango connection ID', {
        invalidOrganisations,
      });
      throw new NonRetriableError(
        'Failed to schedule apps sync due to missing nango connection ID'
      );
    }
    return { organisations };
  }
);

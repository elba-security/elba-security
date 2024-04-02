import { inngest } from '@/inngest/client';
import { getElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '../common/get-organisation';

export type SyncDataProtectionEvents = {
  'google/data_protection.sync.requested': SyncDataProtectionRequested;
};

type SyncDataProtectionRequested = {
  data: {
    organisationId: string;
    isFirstSync: boolean;
    syncStartedAt: string;
  };
};

export const syncDataProtection = inngest.createFunction(
  {
    id: 'google-sync-data-protection',
    retries: 3,
    concurrency: {
      limit: 1,
      key: 'event.data.isFirstSync',
    },
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'google/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'google/data_protection.sync.requested' },
  async ({
    event: {
      data: { organisationId, isFirstSync, syncStartedAt },
    },
    step,
  }) => {
    const { region, googleAdminEmail, googleCustomerId } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail', 'googleCustomerId'] },
    });

    const driveTypes = ['personal', 'shared'] as const;

    const eventsToWait = driveTypes.map((driveType) =>
      step.waitForEvent(`sync-${driveType}-drives`, {
        event: `google/data_protection.sync.drives.${driveType}.completed`,
        if: `async.data.organisationId == '${organisationId}'`,
        timeout: '1day',
      })
    );

    await step.sendEvent(
      'sync-drives',
      driveTypes.map((driveType) => ({
        name: `google/data_protection.sync.drives.${driveType}.requested`,
        data: {
          organisationId,
          region,
          googleAdminEmail,
          googleCustomerId,
          isFirstSync,
          pageToken: null,
        },
      }))
    );

    await Promise.all(eventsToWait);

    const elba = getElbaClient({ organisationId, region });
    await elba.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });

    return { status: 'completed' };
  }
);

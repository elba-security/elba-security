import { elbaRegions, type UsersDeleteUsersRequestedWebhookData } from '@elba-security/schemas';
import { referenceElbaFunction } from '../../elba';
import { type ElbaInngestConfig } from '../../types';

export type UsersDeleteEvent = {
  'users.delete.requested': UsersDeleteUsersRequestedWebhookData;
};

export const createElbaUsersSyncSchedulerFn = (
  { name, sourceId, inngest }: ElbaInngestConfig,
  cron = '0 0 * * *'
) => {
  return inngest.createFunction(
    {
      id: `${name}-schedule-users-sync`,
      retries: 5,
    },
    { cron },
    async ({ step }) => {
      const regionsOrganisations = await Promise.allSettled(
        elbaRegions.map(async (region) => {
          const result = await step.invoke(`get-${region}-organisations`, {
            function: referenceElbaFunction(region, 'organisations.list'),
            data: { sourceId },
            timeout: '1 minute',
          });
          return result.organisations.map(({ id: organisationId, nangoConnectionId }) => ({
            organisationId,
            nangoConnectionId,
            region,
          }));
        })
      );

      const now = new Date().toISOString();
      const organisations = regionsOrganisations
        .filter((result) => result.status === 'fulfilled')
        .flatMap(({ value }) => value);

      if (organisations.length) {
        await step.sendEvent(
          'synchronize-users',
          organisations.map(({ organisationId, nangoConnectionId, region }) => ({
            name: `${name}/users.sync.requested`,
            data: {
              isFirstSync: false,
              organisationId,
              nangoConnectionId,
              region,
              syncStartedAt: now,
            },
          }))
        );
      }
    }
  );
};

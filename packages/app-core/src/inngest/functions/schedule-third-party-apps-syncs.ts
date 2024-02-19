import { env } from '../../common/env';
import type { AnyElbaInngest } from '../client/inngest';

export const scheduleThirdPartyAppsSyncs = <T extends AnyElbaInngest>(inngest: T) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-schedule-third-party-apps-syncs`,
    },
    {
      cron: env.THIRD_PARTY_APPS_SYNC_CRON,
    },
    async ({ step }) => {
      const {
        dbSchema: { organisationsTable },
      } = inngest;
      const organisations = await inngest.db
        .select({
          id: organisationsTable.id,
        })
        .from(organisationsTable);

      if (organisations.length > 0) {
        await step.sendEvent(
          'sync-organisations-third-party-apps',
          organisations.map((organisation) => ({
            name: `${inngest.id}/third_party_apps.sync.requested`,
            data: {
              organisationId: organisation.id,
              isFirstSync: false,
              syncStartedAt: Date.now(),
              cursor: null,
            },
          }))
        );
      }

      return { organisations };
    }
  );

import { env } from '../../common/env';
import type { AnyElbaInngest } from '../client/inngest';

export const scheduleDataProtectionSyncs = <T extends AnyElbaInngest>(inngest: T) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-schedule-data-protection-syncs`,
    },
    {
      cron: env.DATA_PROTECTION_SYNC_CRON,
    },
    async ({ step }) => {
      const {
        dbSchema: { organisationsTable },
        db,
      } = inngest;
      const organisations = await db
        .select({
          id: organisationsTable.id,
        })
        .from(organisationsTable);

      if (organisations.length > 0) {
        await step.sendEvent(
          'sync-organisations-data-protection',
          organisations.map((organisation) => ({
            name: `${inngest.id}/data_protection.sync.requested`,
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

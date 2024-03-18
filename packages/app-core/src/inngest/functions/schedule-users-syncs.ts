import { env } from '../../common/env';
import type { AnyElbaInngest } from '../client/inngest';

export const scheduleUsersSyncs = <T extends AnyElbaInngest>(inngest: T) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-schedule-users-syncs`,
    },
    {
      cron: env.USERS_SYNC_CRON,
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
          'sync-organisations-users',
          organisations.map((organisation) => ({
            name: `${inngest.id}/users.sync.requested`,
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

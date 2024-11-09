import { type ElbaContext } from '../../../types';

export const scheduleUsersSyncs = ({ inngest, config, db, schema }: ElbaContext) =>
  inngest.createFunction(
    {
      id: 'schedule-users-syncs',
    },
    { cron: '0 0 * * *' },
    async ({ step }) => {
      const organisations = await db
        .select({
          id: schema.organisations.id,
        })
        .from(schema.organisations);

      if (organisations.length > 0) {
        await step.sendEvent(
          'synchronize-users',
          organisations.map(({ id }) => ({
            name: `${config.name}/users.sync.requested`,
            data: {
              isFirstSync: false,
              organisationId: id,
              syncStartedAt: new Date().toISOString(),
              cursor: null,
            },
          }))
        );
      }

      return { organisations };
    }
  );

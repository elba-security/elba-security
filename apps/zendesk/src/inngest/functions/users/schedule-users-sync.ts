import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'zendesk-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        auth_token: Organisation.auth_token,
        domain: Organisation.domain,
        region: Organisation.region,
      })
      .from(Organisation);

    if (organisations.length > 0) {
    await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id, domain}) => {
            const usersApiUrl = `${domain}/api/v2/users`;
            return {
                name: 'zendesk/users.sync.triggered',
                data: {
                    organisationId: id,
                    isFirstSync: false,
                    pageUrl: usersApiUrl
                }
            }
        })
    );
}

    return { organisations };
  }
);

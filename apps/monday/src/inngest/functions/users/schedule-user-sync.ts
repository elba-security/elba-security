import { env } from '@/env';
import { db } from '@/database/client.node';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
    { id: 'schedule-users-syncs' },
    { cron: env.USERS_SYNC_CRON },
    async ({ step }) => {
        const organisations = await db
            .select({
                id: Organisation.id,
                token: Organisation.token,
                region: Organisation.region,
            })
            .from(Organisation);

        if (organisations.length > 0) {
            await step.sendEvent(
                'sync-organisations-users',
                organisations.map(({ id, region }) => ({
                    name: 'monday/users.page_sync.requested',
                    data: {
                        isFirstSync: false,
                        organisationId: id,
                        page: 1,
                        region,
                        syncStartedAt: new Date().toISOString()
                    },
                }))
            );
        }

        return { organisations };
    }
);

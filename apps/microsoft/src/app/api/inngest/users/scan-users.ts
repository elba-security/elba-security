import { Elba } from '@elba-security/sdk';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { env } from '@/common/env';
import { inngest } from '../client';
import { handleError } from '../functions/utils';

export const scanUsers = inngest.createFunction(
  {
    id: 'scan-users',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    idempotency: env.VERCEL_ENV !== 'development' ? 'event.data.tenantId' : undefined,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_USERS_SYNCS,
      },
      {
        key: 'event.data.tenantId',
        limit: 1,
      },
    ],
  },
  {
    event: 'users/scan',
  },
  async ({ event, step }) => {
    const { tenantId, syncStartedAt, organizationId, cursor, accessToken } = event.data;

    const elba = new Elba({
      apiKey: env.ELBA_API_KEY,
      organisationId: organizationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const nextCursor = await step
      .run('paginate', async () => {
        const { formattedUsers, nextLink } = await scanUsersByTenantId({
          accessToken,
          tenantId,
          pageLink: cursor,
        });

        if (formattedUsers.length > 0) {
          await elba.users.update({ users: formattedUsers });
        }

        return nextLink;
      })
      .catch(handleError);

    if (nextCursor) {
      await step.sendEvent('scan-users', {
        name: 'users/scan',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
    } else {
      await step.run('finalize', () => elba.users.delete({ syncedBefore: syncStartedAt }));
      return {
        status: 'completed',
      };
    }

    return { status: 'ongoing' };
  }
);

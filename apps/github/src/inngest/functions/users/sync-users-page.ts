import { Elba, type User } from '@elba-security/sdk';
import { and, eq, lt } from 'drizzle-orm/sql';
import { env } from '@/env';
import type { OrganizationMember } from '@/connectors/organization';
import { getPaginatedOrganizationMembers } from '@/connectors/organization';
import { db } from '@/database/client';
import { Admin } from '@/database/schema';
import { inngest } from '../../client';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_USERS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'users/page_sync.requested',
  },
  async ({ event, step }) => {
    const { installationId, organisationId, accountLogin, cursor } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);

    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const nextCursor = await step.run('paginate', async () => {
      const result = await getPaginatedOrganizationMembers(installationId, accountLogin, cursor);

      const admins = result.validMembers
        .filter((member) => member.role === 'ADMIN')
        .map((member) => ({
          id: member.id,
          organisationId,
          lastSyncAt: syncStartedAt,
        }));

      if (admins.length > 0) {
        await db
          .insert(Admin)
          .values(admins)
          .onConflictDoUpdate({
            target: [Admin.id, Admin.organisationId],
            set: {
              lastSyncAt: syncStartedAt,
            },
          });
      }

      if (result.validMembers.length > 0) {
        await elba.users.update({ users: result.validMembers.map(formatElbaUser) });
      }

      return result.nextCursor;
    });

    if (nextCursor) {
      await step.sendEvent('sync-users-page', {
        name: 'users/page_sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', async () => {
      await elba.users.delete({ syncedBefore: syncStartedAt.toISOString() });
      await db
        .delete(Admin)
        .where(and(eq(Admin.organisationId, organisationId), lt(Admin.lastSyncAt, syncStartedAt)));
    });

    return {
      status: 'completed',
    };
  }
);

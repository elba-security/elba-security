import { Elba, type User } from '@elba-security/sdk';
import { and, eq, lt } from 'drizzle-orm';
import { env } from '@/env';
import type { OrganizationMember } from '@/connectors/github/organization';
import { getPaginatedOrganizationMembers } from '@/connectors/github/organization';
import { db } from '@/database/client';
import { adminsTable } from '@/database/schema';
import { inngest } from '../../client';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email || undefined,
  displayName: member.name ?? member.login,
  role: member.role ?? undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'github-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_USERS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
    cancelOn: [
      {
        event: 'github/github.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'github/github.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'github/users.page_sync.requested',
  },
  async ({ event, step, logger }) => {
    const { installationId, organisationId, accountLogin, cursor, region } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);

    const elba = new Elba({
      organisationId,
      region,
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
          .insert(adminsTable)
          .values(admins)
          .onConflictDoUpdate({
            target: [adminsTable.id, adminsTable.organisationId],
            set: {
              lastSyncAt: syncStartedAt,
            },
          });
      }

      if (result.validMembers.length > 0) {
        const users = result.validMembers.map(formatElbaUser);
        logger.info('Sending users batch to elba', { organisationId, users });
        await elba.users.update({ users });
      }

      return result.nextCursor;
    });

    if (nextCursor) {
      await step.sendEvent('sync-users-page', {
        name: 'github/users.page_sync.requested',
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
      const syncedBefore = syncStartedAt.toISOString();
      logger.info('Deleting old users on elba', { organisationId, syncedBefore });
      await elba.users.delete({ syncedBefore });
      await db
        .delete(adminsTable)
        .where(
          and(
            eq(adminsTable.organisationId, organisationId),
            lt(adminsTable.lastSyncAt, syncStartedAt)
          )
        );
    });

    return {
      status: 'completed',
    };
  }
);

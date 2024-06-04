import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { type DropboxTeamMember, getUsers } from '@/connectors/dropbox/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: DropboxTeamMember): User => ({
  id: user.profile.team_member_id,
  displayName: user.profile.name.display_name,
  email: user.profile.email,
  additionalEmails: user.profile.secondary_emails.map((email) => email.email),
});

export const syncUsers = inngest.createFunction(
  {
    id: 'dropbox-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'dropbox/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'dropbox/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'dropbox/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, cursor } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        adminTeamMemberId: organisationsTable.adminTeamMemberId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);

    const nextPage = await step.run('list-users', async () => {
      const {
        validUsers,
        invalidUsers,
        cursor: nextCursor,
      } = await getUsers({
        accessToken,
        cursor,
      });

      if (invalidUsers.length > 0) {
        logger.info('Invalid users found', { invalidUsers });
      }

      if (validUsers.length > 0) {
        const users = validUsers.map(formatElbaUser);
        await elba.users.update({ users });
      }

      return nextCursor;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'dropbox/users.sync.requested',
        data: {
          ...event.data,
          cursor: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);

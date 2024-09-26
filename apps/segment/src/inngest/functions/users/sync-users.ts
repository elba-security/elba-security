import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/segment/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type SegmentUser } from '@/connectors/segment/users';
import { createElbaClient } from '@/connectors/elba/client';

// All users can be deletable from a workspace, therefore we want to prevent the authUser from being deleted
const formatElbaUser = ({
  user,
  workspaceName,
  authUserEmail,
}: {
  user: SegmentUser;
  workspaceName: string;
  authUserEmail: string;
}): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  isSuspendable: authUserEmail !== user.email,
  url: `https://app.segment.com/${workspaceName}/settings/access-management/users/${user.id}/edit`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'segment-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'segment/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'segment/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'segment/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
        workspaceName: organisationsTable.workspaceName,
        authUserEmail: organisationsTable.authUserEmail,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);
    const { workspaceName, authUserEmail } = organisation;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ token, cursor: page });

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, workspaceName, authUserEmail })
      );

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'segment/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
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

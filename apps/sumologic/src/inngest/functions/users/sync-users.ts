import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { type SumologicUser, getUsers } from '@/connectors/sumologic/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserAuthMethod = (user: SumologicUser) => {
  if (user.isMfaEnabled) {
    return 'mfa';
  }
  return 'password';
};
const formatElbaUserDisplayName = (user: SumologicUser) => {
  if (user.firstName === '' || user.lastName === '') {
    return user.email;
  }
  return `${user.firstName} ${user.lastName}`;
};
const formatElbaUser = ({
  user,
  sourceRegion,
  authUserId,
}: {
  user: SumologicUser;
  sourceRegion: string;
  authUserId: string;
}): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  authMethod: formatElbaUserAuthMethod(user),
  additionalEmails: [],
  isSuspendable: user.id !== authUserId,
  url: `https://service.${sourceRegion}.sumologic.com/ui/#/manage/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'sumologic-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'sumologic/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sumologic/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sumologic/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessId: organisationsTable.accessId,
        accessKey: organisationsTable.accessKey,
        sourceRegion: organisationsTable.sourceRegion,
        authUserId: organisationsTable.authUserId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({
      organisationId,
      region: organisation.region,
    });

    const decryptedAccessId = await decrypt(organisation.accessId);
    const authUserId = organisation.authUserId;
    const sourceRegion = organisation.sourceRegion;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessId: decryptedAccessId,
        accessKey: organisation.accessKey,
        sourceRegion,
        page,
      });

      const users = result.validUsers
        .filter(({ isActive }) => isActive)
        .map((user) => formatElbaUser({ user, sourceRegion, authUserId }));

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
        name: 'sumologic/users.sync.requested',
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

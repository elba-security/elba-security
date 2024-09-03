import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/calendly/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type CalendlyUser } from '@/connectors/calendly/users';
import { createElbaClient } from '@/connectors/elba/client';

// extract uuid from user's unique uri like this: "https://api.calendly.com/organization_memberships/AAAAAAAAAAAAAAAA"
const extractUUID = (user: CalendlyUser): string => {
  const regex = /organization_memberships\/(?<uuid>[a-f0-9-]{36})/;
  const match = regex.exec(user.uri);
  return match?.groups?.uuid ? match.groups.uuid : user.user.email;
};
const formatElbaUser = ({
  user,
  authUserUri,
}: {
  user: CalendlyUser;
  authUserUri: string;
}): User => ({
  id: extractUUID(user),
  displayName: user.user.name,
  email: user.user.email,
  role: user.role,
  additionalEmails: [],
  isSuspendable: user.user.uri !== authUserUri,
  url: 'https://calendly.com/app/admin/users',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'calendly-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'calendly/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'calendly/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'calendly/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        authUserUri: organisationsTable.authUserUri,
        region: organisationsTable.region,
        organizationUri: organisationsTable.organizationUri,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);
    const authUserUri = organisation.authUserUri;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken: token,
        organizationUri: organisation.organizationUri,
        page,
      });

      const users = result.validUsers.map((user) => formatElbaUser({ user, authUserUri }));

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
      await step.sendEvent('sync-users', {
        name: 'calendly/users.sync.requested',
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

import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/salesforce/users';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type SalesforceUser } from '@/connectors/salesforce/users';
import { env } from '@/common/env';

export const credentialsRawSchema = z.object({
  instance_url: z.string().url(),
});

const formatElbaUserEmail = (user: SalesforceUser): string | undefined => {
  const emailSchema = z.string().email();
  if (user.Email && emailSchema.safeParse(user.Email).success) {
    return user.Email;
  }
};

const formatElbaUser = ({
  user,
  instanceUrl,
  authUserId,
}: {
  user: SalesforceUser;
  instanceUrl: string;
  authUserId: string;
}): User => ({
  id: user.Id,
  displayName: user.Name,
  email: formatElbaUserEmail(user),
  additionalEmails: [],
  isSuspendable: user.Id !== authUserId,
  role: user.Profile?.Name,
  url: `${instanceUrl}/lightning/r/User/${user.Id}/view`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'salesforce-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SALESFORCE_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'salesforce/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'salesforce/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesforce/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const rawData = credentialsRawSchema.safeParse(credentials.raw);

      if (!rawData.success) {
        throw new NonRetriableError(
          `Nango credentials.raw is invalid for the organisation with id=${organisationId}`
        );
      }

      const { instance_url: instanceUrl } = rawData.data;

      const result = await getUsers({
        accessToken: credentials.access_token,
        instanceUrl,
        offset: page,
      });
      const { userId: authUserId } = await getAuthUser({
        accessToken: credentials.access_token,
        instanceUrl,
      });

      const users = result.validUsers.map((user) =>
        formatElbaUser({
          user,
          instanceUrl,
          authUserId,
        })
      );

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) await elba.users.update({ users });

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'salesforce/users.sync.requested',
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

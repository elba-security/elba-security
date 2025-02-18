import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/brevo/users';
import { inngest } from '@/inngest/client';
import { type BrevoUser } from '@/connectors/brevo/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = (user: BrevoUser): User => ({
  id: user.id,
  displayName: user.email,
  email: user.email,
  additionalEmails: [],
  url: `https://app.brevo.com/user/member`,
  isSuspendable: !user.is_owner,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'brevo-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'brevo/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'brevo/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'brevo/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    const result = await getUsers(nangoCredentialsResult.data.apiKey);

    const users = result.validUsers
      .filter(({ status }) => status === 'active')
      .map((user) => formatElbaUser(user));

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }

    if (users.length > 0) {
      await elba.users.update({ users });
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);

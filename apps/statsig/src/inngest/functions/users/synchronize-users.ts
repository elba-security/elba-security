import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getAllUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type StatsigUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: StatsigUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser = (user: StatsigUser): User => ({
  id: user.email,
  email: user.email,
  displayName: formatElbaUserDisplayName(user),
  role: user.role,
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    // per account requests concurrency is 10
    concurrency: 1,
    retries: 3,
  },
  { event: 'statsig/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { region } = organisation;

    const elba = getElbaClient({ organisationId, region });
    const apiKey = await decrypt(organisation.apiKey);

    const result = await getAllUsers({
      apiKey,
    });

    const users = result.validUsers.map(formatElbaUser);

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }
    await elba.users.update({ users });

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);

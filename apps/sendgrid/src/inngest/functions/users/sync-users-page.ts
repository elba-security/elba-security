import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type SendGridUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: SendGridUser): User => ({
  id: user.username,
  displayName: user.username,
  email: user.email,
  role: user.user_type,
  authMethod: user.is_sso ? 'sso' : 'mfa',
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'sendgrid-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'sendgrid/sendgrid.elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'sendgrid/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, offset, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the SendGrid organisation token
    const token = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({ token: Organisation.token })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return organisation.token;
    });

    const nextPage = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(token, Number(offset));
      // format each SendGrid Users to elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      logger.debug('Sending batch of users to elba: ', { organisationId, users });
      await elba.users.update({ users });

      if (result.pagination.next) {
        return result.pagination.next;
      }
      return null;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'sendgrid/users.page_sync.requested',
        data: {
          ...event.data,
          offset: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);

import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type CalendlyUser, getOrganizationMembers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: CalendlyUser): User => ({
  id: user.user.uri,
  displayName: user.user.name,
  email: user.user.email,
  role: user.role,
  authMethod: 'mfa',
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'calendly-sync-users-page',
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
        event: 'calendly/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'calendly/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, page, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the Calendly API Access Token and Organization Uri
    const [accessToken, organizationUri] = await step.run('get-access-token', async () => {
      const [organisation] = await db
        .select({
          accessToken: Organisation.accessToken,
          organizationUri: Organisation.organizationUri,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return [organisation.accessToken, organisation.organizationUri];
    });

    const nextPage = await step.run('list-users', async () => {
      if (!accessToken || !organizationUri) {
        throw new Error('Access token or organization URI is undefined.');
      }
      // retrieve this users page
      const result = await getOrganizationMembers(accessToken, organizationUri, page);
      // format each Calendly Users to elba users
      const users = result.collection.map(formatElbaUser);
      // send the batch of users to elba
      logger.debug('Sending batch of users to elba: ', { organisationId, users });
      await elba.users.update({ users });

      if (result.pagination.next_page_token) {
        return result.pagination.next_page_token;
      }
      return null;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'calendly/users.page_sync.requested',
        data: {
          ...event.data,
          page: nextPage,
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

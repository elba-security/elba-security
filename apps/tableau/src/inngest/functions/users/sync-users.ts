import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type TableauUser, getUsers } from '@/connectors/tableau/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = ({
  user,
  domain,
  contentUrl,
}: {
  user: TableauUser;
  domain: string;
  contentUrl: string;
}): User => ({
  id: user.id,
  displayName: user.fullName,
  email: user.email,
  additionalEmails: [],
  role: user.siteRole,
  isSuspendable: false,
  url: `https://${domain}/#/site/${contentUrl}/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'tableau-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'tableau/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'tableau/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'tableau/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        region: organisationsTable.region,
        domain: organisationsTable.domain,
        siteId: organisationsTable.siteId,
        token: organisationsTable.token,
        contentUrl: organisationsTable.contentUrl,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { region, domain, siteId, token, contentUrl } = organisation;

    const elba = createElbaClient({ organisationId, region });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        token: await decrypt(token),
        page,
        domain,
        siteId,
      });

      // format each SaaS users to elba users
      const users = result.validUsers.map((user) => formatElbaUser({ user, domain, contentUrl }));
      // send the batch of users to elba

      await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'tableau/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return { status: 'ongoing' };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return { status: 'completed' };
  }
);

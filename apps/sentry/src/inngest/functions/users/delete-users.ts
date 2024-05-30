import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSentryUser } from '@/connectors/sentry/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getWorkspaceIds } from '@/connectors/sentry/auth';

export const deleteUser = inngest.createFunction(
  {
    id: 'sentry-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SENTRY_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sentry/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sentry/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sentry/users.delete.requested' },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${organisationId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);
    const workspaceIds = await step.run('get-workspace-ids', async () => {
      return getWorkspaceIds(accessToken);
    });

    await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        await step.run('delete-user-from-workspace', async () => {
          return deleteSentryUser({
            userId,
            workspaceId,
            accessToken,
          });
        });
      })
    );
  }
);

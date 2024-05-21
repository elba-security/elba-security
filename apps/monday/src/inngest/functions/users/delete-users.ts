import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers as deleteMondayUser } from '@/connectors/monday/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getWorkspaceIds } from '@/connectors/monday/auth';

export const deleteUsers = inngest.createFunction(
  {
    id: 'monday-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MONDAY_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'monday/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'monday/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'monday/users.delete.requested' },
  async ({ event, step }) => {
    const { userIds, organisationId } = event.data;

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
          return deleteMondayUser({
            userIds,
            workspaceId,
            accessToken,
          });
        });
      })
    );
  }
);

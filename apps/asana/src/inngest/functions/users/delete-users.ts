import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteAsanaUser, getUser } from '@/connectors/asana/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'asana-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ASANA_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'asana/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'asana/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'asana/users.delete.requested' },
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
      return getUser({ accessToken, userId });
    });

    await Promise.all(
      workspaceIds.map(async (workspaceId) =>
        step.run(`delete-user-from-workspace-${workspaceId}`, async () =>
          deleteAsanaUser({
            userId,
            workspaceId,
            accessToken,
          })
        )
      )
    );
  }
);

import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/jira/users';

export const deleteSourceUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'jira/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        cloudId: organisationsTable.cloudId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation`);
    }

    const { accessToken, cloudId } = organisation;
    
    await deleteUser({
      userId,
      accessToken,
      cloudId,
    });
  }
);

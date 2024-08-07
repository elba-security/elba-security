import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers as deleteDocusignUsers } from '@/connectors/docusign/users';
import { decrypt } from '@/common/crypto';

export const deleteUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'docusign/users.delete.requested' },
  async ({ event }) => {
    const { organisationId, userIds } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        accountId: organisationsTable.accountId,
        apiBaseUri: organisationsTable.apiBaseUri,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation`);
    }

    const accessToken = await decrypt(organisation.accessToken);

    await deleteDocusignUsers({
      accessToken,
      apiBaseUri: organisation.apiBaseUri,
      users: userIds.map((userId) => ({ userId })),
      accountId: organisation.accountId,
    });
  }
);

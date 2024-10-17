import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db, tables } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'calendly-remove-organisation',
    retries: 5,
    cancelOn: [
      {
        event: 'calendly/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'calendly/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        region: tables.organisationsTable.region,
      })
      .from(tables.organisationsTable)
      .where(eq(tables.organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({
      organisationId,
      region: organisation.region,
    });

    await elba.connectionStatus.update({ hasError: true });

    await db
      .delete(tables.organisationsTable)
      .where(eq(tables.organisationsTable.id, organisationId));
  }
);

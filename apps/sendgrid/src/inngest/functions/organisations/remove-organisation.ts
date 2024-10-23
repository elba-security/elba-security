import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getElbaClient } from '@/connectors/elba/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'sendgrid-remove-organisation',
    retries: 5,
    cancelOn: [
      {
        event: 'sendgrid/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sendgrid/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'sendgrid/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({
      organisationId,
      region: organisation.region,
    });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);

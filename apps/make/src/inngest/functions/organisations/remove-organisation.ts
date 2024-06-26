import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'make-remove-organisation',
    priority: {
      run: '600',
    },
    cancelOn: [
      {
        event: 'make/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  {
    event: 'make/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId } = event.data
    const [organisation] = await db
      .select({
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(Organisation).where(eq(Organisation.id, organisationId));
  }
);

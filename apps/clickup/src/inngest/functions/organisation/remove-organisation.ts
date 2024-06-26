import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getElbaClient } from '@/connectors/clickup/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'clickup-remove-organisation',
    priority: {
      run: '600',
    },
    cancelOn: [
      {
        event: 'clickup/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  {
    event: 'clickup/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(Organisation).where(eq(Organisation.id, organisationId));
  }
);

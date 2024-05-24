import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { getElbaClient } from '@/connectors/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'clickup-remove-organisation',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'clickup/elba_app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId, region } = event.data;
    const [organisation] = await db
      .select({
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(Organisation).where(eq(Organisation.id, organisationId));
  }
);

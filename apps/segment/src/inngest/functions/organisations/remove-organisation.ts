import { eq } from 'drizzle-orm';
import { Elba } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'segment-remove-organisation',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'segment/segment.elba_app.uninstalled',
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

    const elba = new Elba({
      organisationId,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(Organisation).where(eq(Organisation.id, organisationId));
  }
);

import { eq } from 'drizzle-orm';
import { Elba } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { inngest } from '../../client';
import { organisations } from '@/database';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'dropbox-remove-organisation',
    retries: env.DROPBOX_REMOVE_ORGANISATION_MAX_RETRY,
    cancelOn: [
      {
        event: 'dropbox/elba_app.cancel.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'dropbox/elba_app.uninstall.requested',
  },
  async ({ event }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        region: organisations.region,
      })
      .from(organisations)
      .where(eq(organisations.organisationId, organisationId));

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

    await db.delete(organisations).where(eq(organisations.organisationId, organisationId));
  }
);

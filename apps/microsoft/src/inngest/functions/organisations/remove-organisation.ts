import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { env } from '@/env';
import { organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '@/inngest/common/organisations';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'microsoft-remove-organisation',
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'microsoft/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId } = event.data;

    const organisation = await getOrganisation(organisationId);

    const elba = createElbaClient(organisationId, organisation.region);

    await elba.connectionStatus.update({ hasError: true });

    await db
      .update(organisationsTable)
      .set({ isDeleted: true })
      .where(eq(organisationsTable.id, organisationId));
  }
);

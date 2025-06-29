import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getElbaClient } from '@/connectors/elba/client';

export type RemoveOrganisationEvents = {
  'gmail/common.remove_organisation.requested': RemoveOrganisationRequested;
};

type RemoveOrganisationRequested = {
  data: {
    organisationId: string;
  };
};

export const removeOrganisation = inngest.createFunction(
  {
    id: 'gmail-remove-organisation',
    retries: 3,
    cancelOn: [
      {
        event: 'gmail/common.organisation.inserted',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'gmail/common.remove_organisation.requested' },
  async ({
    event: {
      data: { organisationId },
    },
    step,
    logger,
  }) => {
    const [organisation] = await step.run('delete-organisation', () => {
      return db
        .delete(organisationsTable)
        .where(eq(organisationsTable.id, organisationId))
        .returning({
          region: organisationsTable.region,
        });
    });

    if (organisation) {
      logger.info('Google organisation deleted', { organisationId, region: organisation.region });
      const elba = getElbaClient({ organisationId, region: organisation.region });
      await elba.connectionStatus.update({ errorType: 'unauthorized' });
    }

    return { status: 'deleted' };
  }
);

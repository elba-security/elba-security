import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getElbaClient } from '@/connectors/elba/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';

export type RemoveOrganisationEvents = {
  'google/common.remove_organisation.requested': RemoveOrganisationRequested;
};

type RemoveOrganisationRequested = {
  data: {
    organisationId: string;
    inngestRunId: string;
  };
};

export const removeOrganisation = inngest.createFunction(
  {
    id: 'google-remove-organisation',
    retries: 3,
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'google/common.remove_organisation.requested' },
  async ({
    event: {
      data: { organisationId, inngestRunId },
    },
    step,
    logger,
  }) => {
    const [organisation] = await step.run('get-organisation', () =>
      db
        .select({
          googleAdminEmail: organisationsTable.googleAdminEmail,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId))
    );

    if (!organisation) {
      return { status: 'deleted' };
    }

    const isAuthorized = await step.run('check-client-authorization', async () => {
      const serviceAccount = await getGoogleServiceAccountClient(organisation.googleAdminEmail);
      try {
        await serviceAccount.authorize();
        return true;
      } catch {
        return false;
      }
    });

    if (isAuthorized) {
      logger.warn('Client is still authorized despite an uninstallation request', {
        organisationId,
        inngestRunId,
      });

      return { status: 'ignored', message: 'Client is still authorized' };
    }

    const [deletedOrganisation] = await step.run('delete-organisation', () => {
      return db
        .delete(organisationsTable)
        .where(eq(organisationsTable.id, organisationId))
        .returning({
          region: organisationsTable.region,
        });
    });

    if (deletedOrganisation) {
      logger.info('Google organisation deleted', {
        organisationId,
        region: deletedOrganisation.region,
      });
      const elba = getElbaClient({ organisationId, region: deletedOrganisation.region });
      await elba.connectionStatus.update({ errorType: 'unauthorized' });
    }

    return { status: 'deleted' };
  }
);

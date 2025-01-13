import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'bitbucket-remove-organisation',
    cancelOn: [
      {
        event: 'bitbucket/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  {
    event: 'bitbucket/app.uninstalled',
  },
  async ({ event }) => {
    const { organisationId, region, errorType, errorMetadata } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    await elba.connectionStatus.update({ errorType, errorMetadata });
  }
);

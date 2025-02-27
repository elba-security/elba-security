import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'harvest-remove-organisation',
    retries: 5,
    cancelOn: [
      {
        event: 'harvest/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'harvest/app.uninstalled',
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

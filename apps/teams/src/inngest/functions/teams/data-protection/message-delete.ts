import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';

export const messageDelete = inngest.createFunction(
  {
    id: 'teams-data-protection-object-delete-requested',
    retries: env.TEAMS_SYNC_MAX_RETRY,
  },
  { event: 'teams/data.protection.object.delete.requested' },
  async ({ event }) => {
    const { organisationId, region, messageId } = event.data;

    const elbaClient = createElbaClient(organisationId, region);

    await elbaClient.dataProtection.deleteObjects({ ids: [`${organisationId}:${messageId}`] });
  }
);

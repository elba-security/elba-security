import { inngest } from '@/inngest/client';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';

export const refreshData = async (data: ElbaPayload) => {
  await inngest.send({
    name: 'teams/teams.sync.triggered',
    data: {
      organisationId: data.organisationId,
      syncStartedAt: new Date().toISOString(),
      skipToken: null,
    },
  });
};

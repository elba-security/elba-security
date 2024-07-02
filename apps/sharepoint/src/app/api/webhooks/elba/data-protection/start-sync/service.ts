import { inngest } from '@/inngest/client';

export const startSync = async (organisationId: string) => {
  await inngest.send({
    name: 'sharepoint/data_protection.sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      skipToken: null,
    },
  });
};

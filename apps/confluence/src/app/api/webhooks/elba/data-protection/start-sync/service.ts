import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  await inngest.send({
    name: 'confluence/data_protection.spaces.sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      type: 'global',
      cursor: null,
    },
  });
};

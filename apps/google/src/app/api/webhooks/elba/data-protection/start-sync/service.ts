import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  await inngest.send({
    name: 'google/data_protection.sync.requested',
    data: {
      isFirstSync: true,
      syncStartedAt: new Date().toISOString(),
      organisationId,
    },
  });
};

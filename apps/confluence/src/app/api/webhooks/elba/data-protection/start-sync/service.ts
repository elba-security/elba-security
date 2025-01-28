import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async ({
  organisationId,
  nangoConnectionId,
  region,
}: {
  organisationId: string;
  nangoConnectionId: string;
  region: string;
}) => {
  await inngest.send({
    name: 'confluence/data_protection.spaces.sync.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      type: 'global',
      cursor: null,
    },
  });
};

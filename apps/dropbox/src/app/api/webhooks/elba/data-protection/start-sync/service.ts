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
    name: 'dropbox/data_protection.shared_links.start.sync.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      cursor: null,
    },
  });
};

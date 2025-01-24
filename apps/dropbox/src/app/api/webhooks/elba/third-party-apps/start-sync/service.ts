import { inngest } from '@/inngest/client';

export const startThirdPartySync = async ({
  organisationId,
  nangoConnectionId,
  region,
}: {
  organisationId: string;
  nangoConnectionId: string;
  region: string;
}) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.sync.requested',
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

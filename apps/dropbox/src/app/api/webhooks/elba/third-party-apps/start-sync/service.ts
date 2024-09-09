import { inngest } from '@/inngest/client';

export const startThirdPartySync = async (organisationId: string) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      cursor: null,
    },
  });
};

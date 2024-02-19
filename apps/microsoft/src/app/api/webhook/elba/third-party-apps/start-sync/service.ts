import { inngest } from '@/inngest/client';

export const startThirdPartyAppsSync = async (organisationId: string) => {
  await inngest.send({
    name: 'microsoft/third_party_apps.sync.requested',
    data: {
      organisationId,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      skipToken: null,
    },
  });
};

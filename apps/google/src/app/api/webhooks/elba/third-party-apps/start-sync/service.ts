import { inngest } from '@/inngest/client';

export const startThirdPartyAppsSync = async (organisationId: string) => {
  await inngest.send({
    name: 'google/third_party_apps.sync.requested',
    data: {
      isFirstSync: true,
      syncStartedAt: new Date().toISOString(),
      organisationId,
      pageToken: null,
    },
  });
};

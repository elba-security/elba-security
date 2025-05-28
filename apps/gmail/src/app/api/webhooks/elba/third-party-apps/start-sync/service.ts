import { inngest } from '@/inngest/client';

export const startThirdPartyAppsSync = async (organisationId: string) => {
  await inngest.send({
    // @ts-expect-error -- event does not exists right now
    name: 'gmail/third_party_apps.sync.requested',
    data: {
      // @ts-expect-error -- event does not exists right now
      isFirstSync: true,
      syncStartedAt: new Date().toISOString(),
      organisationId,
      pageToken: null,
    },
  });
};

import { inngest } from '@/inngest/client';

export const startThirdPartySync = async (organisationId: string) => {
  const syncStartedAt = Date.now();

  await inngest.send({
    name: 'dropbox/third_party_apps.sync_page.triggered',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt,
    },
  });
};

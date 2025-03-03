import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
  region: string;
  nangoConnectionId: string;
};

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
  nangoConnectionId,
  region,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.refresh_objects.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      userId,
      appId,
      isFirstSync: true,
    },
  });
};

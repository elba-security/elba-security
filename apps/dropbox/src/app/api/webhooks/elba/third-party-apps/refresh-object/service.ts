import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.refresh_objects.requested',
    data: {
      organisationId,
      userId: userId,
      appId,
      isFirstSync: true,
    },
  });
};

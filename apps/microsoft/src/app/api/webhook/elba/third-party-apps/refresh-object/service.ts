import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  appId: string;
  userId: string;
};

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  appId,
  userId,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'microsoft/third_party_apps.refresh_app_permission.requested',
    data: {
      organisationId,
      appId,
      userId,
    },
  });
};

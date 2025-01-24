import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
  region: string;
  nangoConnectionId: string;
};

export const deleteThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
  nangoConnectionId,
  region,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.delete_object.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      userId,
      appId,
    },
  });
};

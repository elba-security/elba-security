import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  userId: string;
  appId: string;
  nangoConnectionId: string;
};

export const deleteThirdPartyAppsObject = async ({
  userId,
  appId,
  nangoConnectionId,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.delete_object.requested',
    data: {
      nangoConnectionId,
      userId,
      appId,
    },
  });
};

import { inngest } from '@/inngest/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

export const deleteThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
}: RefreshThirdPartyAppsObject) => {
  await inngest.send({
    name: 'dropbox/third_party_apps.delete_object.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });
};

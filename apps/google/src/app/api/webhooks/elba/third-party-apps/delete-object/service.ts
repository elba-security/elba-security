import { inngest } from '@/inngest/client';

export const deleteThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
}: {
  organisationId: string;
  userId: string;
  appId: string;
}) => {
  await inngest.send({
    name: 'google/third_party_apps.delete_object.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });
};

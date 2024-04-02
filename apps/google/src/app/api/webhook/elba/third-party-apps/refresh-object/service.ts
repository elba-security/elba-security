import { inngest } from '@/inngest/client';

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
}: {
  organisationId: string;
  userId: string;
  appId: string;
}) => {
  await inngest.send({
    name: 'google/third_party_apps.refresh_object.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });
};

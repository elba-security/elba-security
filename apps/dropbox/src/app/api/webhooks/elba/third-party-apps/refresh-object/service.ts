import { inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '@/inngest/functions/common/data';

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
  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  await inngest.send({
    name: 'dropbox/third_party_apps.refresh_objects.requested',
    data: {
      organisationId,
      userId: userId,
      appId,
      isFirstSync: true,
    },
  });

  return {
    status: 'completed',
  };
};

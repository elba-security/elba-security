import { inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '@/inngest/functions/common/data';

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
  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  await inngest.send({
    name: 'dropbox/third_party_apps.delete_object.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });

  return {
    status: 'completed',
  };
};

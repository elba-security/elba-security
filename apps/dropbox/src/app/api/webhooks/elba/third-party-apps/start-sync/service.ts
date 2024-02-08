import { inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '@/inngest/functions/common/data';

export const startThirdPartySync = async (organisationId: string) => {
  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const syncStartedAt = Date.now();
  await inngest.send({
    name: 'dropbox/third_party_apps.sync_page.triggered',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt,
    },
  });

  return {
    status: 'completed',
  };
};

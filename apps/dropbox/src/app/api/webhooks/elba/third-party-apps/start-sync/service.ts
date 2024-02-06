import { inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '@/inngest/functions/common/data';

export const startThirdPartySync = async (organisationId: string) => {
  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const syncStartedAt = new Date().toISOString();
  await inngest.send({
    name: 'third-party-apps/run-sync-jobs',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt,
    },
  });

  return {
    success: true,
  };
};

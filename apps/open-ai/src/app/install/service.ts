import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  sourceOrganizationId: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  sourceOrganizationId,
  region,
}: SetupOrganisationParams) => {
  const [organisation] = await db
    .insert(Organisation)
    .values({ id: organisationId, sourceOrganizationId, region, token })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token,
      },
    })
    .returning();
  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }
  await inngest.send({
    name: 'open-ai/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
    },
  });
  return organisation;
};

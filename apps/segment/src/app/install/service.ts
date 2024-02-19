import { validateToken } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  region,
}: SetupOrganisationParams) => {
  await validateToken(token);
  const [organisation] = await db
    .insert(Organisation)
    .values({ id: organisationId, region, token })
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
    name: 'segment/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: '0',
    },
  });
  return organisation;
};

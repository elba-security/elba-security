import { addSeconds } from 'date-fns';
import { getAccessToken } from '@/connectors/auth';
import { db, Organisation } from '@/database';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresIn, organization } = await getAccessToken(code);
  const [organisation] = await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken,
      refreshToken,
      organizationUri: organization,
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken,
        refreshToken,
        organizationUri: organization,
        region,
      },
    })
    .returning();

  await inngest.send([
    {
      name: 'calendly/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'calendly/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        region,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
  ]);
  return organisation;
};

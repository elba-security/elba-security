import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
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
  // retrieve token from SaaS API using the given code
  const token = await getToken(code);

  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: expiresAt,
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresIn: expiresAt,
        region,
      },
    });

  await inngest.send([
    {
      name: 'zoom/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        region,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
  ]);
};

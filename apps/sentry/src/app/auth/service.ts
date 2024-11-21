import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/sentry/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
  organizationSlug: string;
  installationId: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
  installationId,
  organizationSlug,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresAt } = await getToken(code, installationId);

  const encryptedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encodedRefreshToken,
      installationId,
      organizationSlug,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encodedRefreshToken,
        installationId,
        organizationSlug,
        region,
      },
    });

  await inngest.send([
    {
      name: 'sentry/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'sentry/app.installed',
      data: {
        organisationId,
        region,
      },
    },
    {
      name: 'sentry/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(expiresAt).getTime(),
      },
    },
  ]);
};

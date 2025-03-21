import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/gusto/auth';
import { getTokenInfo, getAuthUser } from '@/connectors/gusto/users';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

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
  const { accessToken, refreshToken } = await getToken(code);
  const { companyId, adminId } = await getTokenInfo(accessToken);
  const { authUserEmail } = await getAuthUser({ accessToken, adminId, companyId });

  const encryptedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encodedRefreshToken,
      region,
      companyId,
      authUserEmail,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encodedRefreshToken,
        region,
        companyId,
        authUserEmail,
      },
    });

  await inngest.send([
    {
      name: 'gusto/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 1,
      },
    },
    {
      name: 'gusto/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};

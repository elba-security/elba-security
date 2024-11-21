import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/hubspot/auth';
import { getAccountInfo } from '@/connectors/hubspot/account-info';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAuthUser } from '@/connectors/hubspot/users';

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
  const { accessToken, refreshToken, expiresIn } = await getToken(code);

  const accountInfo = await getAccountInfo(accessToken);
  const authUser = await getAuthUser(accessToken);

  const encryptedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      authUserId: authUser.userId,
      accessToken: encryptedAccessToken,
      refreshToken: encodedRefreshToken,
      timeZone: accountInfo.timeZone,
      portalId: accountInfo.portalId,
      domain: accountInfo.uiDomain,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encodedRefreshToken,
        timeZone: accountInfo.timeZone,
        portalId: accountInfo.portalId,
        domain: accountInfo.uiDomain,
        region,
      },
    });

  await inngest.send([
    {
      name: 'hubspot/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'hubspot/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'hubspot/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'hubspot/timezone.refresh.requested',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};

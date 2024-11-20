import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/calendly/auth';
import { getAuthUser } from '@/connectors/calendly/users';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getOrganisation } from '@/connectors/calendly/organisation';
import { env } from '@/common/env';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

const isDevelopment =
  (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') && process.env.NODE_ENV !== 'test';

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresIn, organizationUri } = await getToken(code);

  // For testing purposes, we user trail account & we don't want to check the plan and stage of the organisation
  if (!isDevelopment) {
    const { plan, stage } = await getOrganisation({ accessToken, organizationUri });
    if (['basic', 'essentials'].includes(plan) || stage !== 'paid') {
      return {
        isInvalidPlan: true,
      };
    }
  }

  const { authUserUri } = await getAuthUser(accessToken);

  const encryptedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encodedRefreshToken,
      region,
      organizationUri,
      authUserUri,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encodedRefreshToken,
        region,
        organizationUri,
        authUserUri,
      },
    });

  await inngest.send([
    {
      name: 'calendly/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'calendly/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'calendly/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};

import { addSeconds } from 'date-fns/addSeconds';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { getAuthUser } from '@/connectors/bitbucket/users';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  workspaceId: string;
};

const bitbucketTokenCookieSchema = z.object({
  organisationId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  region: z.string(),
});

export const setupOrganisation = async ({ workspaceId }: SetupOrganisationParams) => {
  const authCookie = cookies().get('bitbucketToken')?.value;

  if (!authCookie) {
    throw new Error('No auth cookie found');
  }

  const parsedCookie: unknown = JSON.parse(authCookie);

  const result = bitbucketTokenCookieSchema.safeParse(parsedCookie);

  if (!result.success) {
    throw new Error('Invalid auth cookie');
  }

  const { organisationId, accessToken, refreshToken, expiresAt, region } = result.data;

  const { uuid: authUserId } = await getAuthUser(accessToken);

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      authUserId,
      workspaceId,
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        authUserId,
        workspaceId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'bitbucket/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'bitbucket/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'bitbucket/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresAt).getTime(),
      },
    },
  ]);
};

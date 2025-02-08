import { addSeconds } from 'date-fns/addSeconds';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  workspaceId: string;
  workspaceSubdomain: string;
};

const airslateTokenCookieSchema = z.object({
  organisationId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  region: z.string(),
});

export const setupOrganisation = async ({
  workspaceId,
  workspaceSubdomain,
}: SetupOrganisationParams) => {
  const authCookie = cookies().get('airslateToken')?.value;
  if (!authCookie) {
    throw new Error('No auth cookie found');
  }

  const parsedCookie: unknown = JSON.parse(authCookie);

  const result = airslateTokenCookieSchema.safeParse(parsedCookie);

  if (!result.success) {
    throw new Error('Invalid auth cookie');
  }

  const { organisationId, accessToken, refreshToken, expiresAt, region } = result.data;

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      workspaceId,
      workspaceSubdomain,
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        workspaceId,
        workspaceSubdomain,
        region,
      },
    });

  await inngest.send([
    {
      name: 'airslate/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: '1',
      },
    },
    {
      name: 'airslate/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'airslate/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresAt).getTime(),
      },
    },
  ]);
};

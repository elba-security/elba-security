import { addSeconds } from 'date-fns/addSeconds';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { checkWorkspaceSetting , getAuthUser } from '@/connectors/azuredevops/users';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  workspaceId: string;
};

const azuredevopsTokenCookieSchema = z.object({
  organisationId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
  region: z.string(),
});

export const setupOrganisation = async ({ workspaceId }: SetupOrganisationParams) => {
  const authCookie = cookies().get('azuredevopsToken')?.value;

  if (!authCookie) {
    throw new Error('No auth cookie found');
  }

  const parsedCookie: unknown = JSON.parse(authCookie);

  const result = azuredevopsTokenCookieSchema.safeParse(parsedCookie);

  if (!result.success) {
    throw new Error('Invalid auth cookie');
  }

  const { organisationId, accessToken, refreshToken, expiresAt, region } = result.data;

  const { isInvalidSecuritySetting } = await checkWorkspaceSetting({ accessToken, workspaceId });

  if (isInvalidSecuritySetting) {
    redirect(`/connection?workspace=${encodeURIComponent(JSON.stringify(workspaceId))}`);
  }

  const { authUserEmail } = await getAuthUser(accessToken);

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      workspaceId,
      region,
      authUserEmail,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        workspaceId,
        region,
        authUserEmail,
      },
    });

  await inngest.send([
    {
      name: 'azuredevops/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'azuredevops/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'azuredevops/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), parseInt(expiresAt, 10)).getTime(),
      },
    },
  ]);
};

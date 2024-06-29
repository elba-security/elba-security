import { addSeconds } from 'date-fns';
import { getAccessToken } from '@/connectors/auth';
import { db, organisationsTable } from '@/database';
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
  const { accessToken, refreshToken, expiresIn } = await getAccessToken(code);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken,
      refreshToken,
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken,
        refreshToken,
        region,
      },
    })
    .returning();

  await inngest.send([
    {
      name: 'heroku/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'heroku/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        cursor: null,
      },
    },
    {
      name: 'heroku/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};

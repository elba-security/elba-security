import { getAccessToken } from '@/connectors/clickup/auth';
import { getTeamIds } from '@/connectors/clickup/team';
import { db, Organisation } from '@/database';
import { inngest } from '@/inngest/client';
import { encrypt } from '../../common/crypto';

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
  const accessToken = await getAccessToken(code);
  const encodedToken = await encrypt(accessToken);
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken: encodedToken,
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken: encodedToken,
        region,
      },
    });

  await inngest.send({
    name: 'clickup/users.start_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      syncStartedAt: Date.now(),
    },
  });
};

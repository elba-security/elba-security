import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAccountId } from '@/connectors/users';

type SetupOrganisationParams = {
  organisationId: string;
  personalToken: string;
  dbtRegion: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  personalToken,
  dbtRegion,
  region,
}: SetupOrganisationParams) => {
  const encodedpersonalToken = await encrypt(personalToken);

  const { accountId } = await getAccountId({ personalToken, dbtRegion });

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accountId,
      region,
      personalToken: encodedpersonalToken,
      dbtRegion,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accountId,
        region,
        personalToken: encodedpersonalToken,
        dbtRegion,
      },
    });

  await inngest.send([
    {
      name: 'dbtlabs/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'dbtlabs/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};

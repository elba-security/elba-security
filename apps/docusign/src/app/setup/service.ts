import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken, getAccountId } from '@/connectors/auth';
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
  // retrieve token from SaaS API using the given code
  const { accessToken, refreshToken, expiresIn } = await getToken(code);
  const { accountId, apiBaseURI } = await getAccountId(accessToken);

  await db
    .insert(Organisation)
    .values({ id: organisationId, accountId, accessToken, refreshToken, region, apiBaseURI })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accountId,
        accessToken,
        refreshToken,
        region,
        apiBaseURI,
      },
    });

  await inngest.send([
    {
      name: 'docusign/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'docusign/docusign.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
    {
      name: 'docusign/docusign.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};

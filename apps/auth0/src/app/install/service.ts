import { getToken } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  clientId: string;
  clientSecret: string;
  domain: string;
  audience: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  clientId,
  clientSecret,
  domain,
  audience,
  region,
}: SetupOrganisationParams) => {
  await getToken(clientId, clientSecret, audience, domain);
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      region,
      clientId,
      clientSecret,
      audience,
      domain,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        clientId,
        clientSecret,
        domain,
        audience,
      },
    });
  await inngest.send({
    name: 'auth0/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: 0,
    },
  });
};

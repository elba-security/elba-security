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
  sourceOrganizationId: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  clientId,
  clientSecret,
  domain,
  audience,
  sourceOrganizationId,
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
      sourceOrganizationId,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        clientId,
        clientSecret,
        domain,
        audience,
        sourceOrganizationId,
      },
    });
  await inngest.send({
    name: 'auth0/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
    },
  });
};

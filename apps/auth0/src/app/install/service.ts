import { getToken } from '@/connectors/auth';
import { deleteUser, getUsers } from '@/connectors/users';
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
  // await getToken(clientId, clientSecret, domain, audience);
  // await db
  //   .insert(Organisation)
  //   .values({
  //     id: organisationId,
  //     region,
  //     clientId,
  //     clientSecret,
  //     audience,
  //     domain,
  //     sourceOrganizationId,
  //   })
  //   .onConflictDoUpdate({
  //     target: Organisation.id,
  //     set: {
  //       region,
  //       clientId,
  //       clientSecret,
  //       domain,
  //       audience,
  //       sourceOrganizationId,
  //     },
  //   });
  // await inngest.send({
  //   name: 'sendgrid/users.page_sync.requested',
  //   data: {
  //     isFirstSync: true,
  //     organisationId,
  //     region,
  //     syncStartedAt: Date.now(),
  //     offset: 0,
  //   },
  // });
};

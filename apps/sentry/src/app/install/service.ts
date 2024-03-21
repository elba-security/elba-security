import { getUsers } from '../../connectors/users';
import { db } from '../../database/client';
import { Organisation } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
 organisationId: string;
 sourceOrganizationId:string;
 token: string;
 region: string;
};

export const registerOrganisation = async ({
 organisationId,
 token,
 sourceOrganizationId,
 region,
}: SetupOrganisationParams) => {
await getUsers(token,sourceOrganizationId,null)
 await db
   .insert(Organisation)
   .values({ id: organisationId, region, token,sourceOrganizationId })
   .onConflictDoUpdate({
     target: Organisation.id,
     set: {
       region,
       token,
       sourceOrganizationId,
     },
   })
};


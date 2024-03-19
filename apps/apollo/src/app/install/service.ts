import { getUsers } from '../../connectors/users';
import { db } from '../../database/client';
import { Organisation } from '../../database/schema';


type SetupOrganisationParams = {
 organisationId: string;
 token: string;
 region: string;
};


export const registerOrganisation = async ({
 organisationId,
 token,
 region,
}: SetupOrganisationParams) => {
 await getUsers(token,null)
 await db
   .insert(Organisation)
   .values({ id: organisationId, region, token })
   .onConflictDoUpdate({
     target: Organisation.id,
     set: {
       region,
       token,
     },
   })
};

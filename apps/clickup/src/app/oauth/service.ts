import { getAccessToken } from '@/connectors/auth';
import { getTeamId } from '@/connectors/team';
import { getUsers } from '@/connectors/users';
import { db, Organisation } from '@/database';
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
 const accessToken = await getAccessToken(code);
const teamId= await getTeamId(accessToken);
const result= await getUsers(accessToken,teamId)
 console.log("team is ", result)
};

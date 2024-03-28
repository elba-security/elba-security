import { getAccessToken } from '@/connectors/auth';
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
};

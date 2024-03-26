import { logger } from "@elba-security/logger"
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';


type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  domain: string;
  clientId: string;
  clientSecret: string
};

export const registerOrganisation = async ({organisationId, region, domain, clientId, clientSecret}:SetupOrganisationParams)=>{
  logger.info(`Setting up organization, ${organisationId} ${region}`);
  await db.insert(Organisation).values({ 
    id: organisationId, 
    region, 
    domain, 
    client_id: clientId, 
    client_secret:clientSecret 
  }).onConflictDoUpdate({
      target: Organisation.id,
      set: {
        id: organisationId,
        region,
        domain,
        client_id: clientId,
        client_secret:clientSecret
      },
    })
}
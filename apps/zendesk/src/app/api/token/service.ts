import { logger } from "@elba-security/logger"
import { eq } from "drizzle-orm";
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from "@/inngest/client";


type UpdateOrganisationParams = {
  authToken: string;
  organisationId:string;
};

type FindOrganisationParams = {
  organisationId:string;
}

type OrganizationRecordObject = {
  id: string;
  region: string;
  createdAt: string; 
  domain: string;
  client_id: string;
  client_secret: string;
  auth_token: string;
}


export const updateOrganization = async ({organisationId, authToken}: UpdateOrganisationParams)=>{
  logger.info(`Updating the organization, ${organisationId} ${authToken}`);

  const [organisation] = await db.update(Organisation)
  .set({ auth_token: authToken })
  .where(eq(Organisation.id, organisationId)).returning({region: Organisation.region, domain: Organisation.domain});

  if (organisation){
  const usersApiUrl = `${organisation.domain}/api/v2/users`
  await inngest.send({
    name: 'zendesk/users.sync.triggered',
    data: {
      organisationId,
      isFirstSync: true,
      pageUrl: usersApiUrl
    },
  });
  }
}

export const findOrganisation = async ({organisationId}: FindOrganisationParams): Promise<OrganizationRecordObject[]>=>{
  logger.info(`Finding the organisation with id ${organisationId}`);
  const organisation = await db.select().from(Organisation).where(eq(Organisation.id, organisationId));
  return organisation as OrganizationRecordObject[] | [];
} 
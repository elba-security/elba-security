import { eq } from 'drizzle-orm';
import { db, Organisation } from '@/database';


export type RefreshTokenResult = {
 organisationId: string;
 accessToken: string;
};


export const getOrganisationRefreshToken = async (organisationId: string) => {
 return db
   .select({
     refreshToken: Organisation.refreshToken,
   })
   .from(Organisation)
   .where(eq(Organisation.id, organisationId));
};


export const updateOrganisationTokens = async ({
 organisationId,
 accessToken,
}: RefreshTokenResult) => {
 return db
   .update(Organisation)
   .set({
     id: organisationId,
     accessToken,
     updatedAt: new Date(),
   })
   .where(eq(Organisation.id, organisationId))
   .returning({
     organisationId: Organisation.id,
     updatedAt: Organisation.updatedAt,
   });
};  

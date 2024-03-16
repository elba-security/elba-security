import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';


export const deleteVercelUser = inngest.createFunction(
 {
   id: 'vercel-delete-user',
   priority: {
     run: '600',
   },
   retries: env.REMOVE_ORGANISATION_MAX_RETRY,
 },
 {
   event: 'vercel/users.delete.requested',
 },
 async ({ event, step }) => {
   const { id, organisationId } = event.data;


   // retrieve the Vercel organisation token
   const [token, teamId] = await step.run('get-token', async () => {
     const [organisation] = await db
       .select({
         token: Organisation.token,
         teamId: Organisation.teamId,
       })
       .from(Organisation)
       .where(eq(Organisation.id, organisationId));
     if (!organisation) {
       throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
     }
     return [organisation.token, organisation.teamId];
   });


   if (token && teamId) {
     await step.run('delete-user', async () => {
       await deleteUser(token, teamId, id);
     });
   }


   return {
     status: 'completed',
   };
 }
);

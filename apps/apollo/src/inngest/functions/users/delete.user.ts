import { Elba} from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';




export const deleteApolloUser = inngest.createFunction(
{
  id: 'apollo-delete-user',
  priority: {
    run: '600',
  },
  retries: env.REMOVE_ORGANISATION_MAX_RETRY,
},
{
  event: 'apollo/users.delete.requested',
},
async ({ event, step }) => {
  const { id, organisationId,region } = event.data;


  const elba = new Elba({
   organisationId,
   apiKey: env.ELBA_API_KEY,
   baseUrl: env.ELBA_API_BASE_URL,
   region,
 });


  // retrieve the Apollo organisation token
  const token = await step.run('get-token', async () => {
   const [result] = await db
     .select({
       token: Organisation.token,
     })
     .from(Organisation)
     .where(eq(Organisation.id, organisationId));
   if (!result) {
     throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
   }
   return result.token;
 });




   await step.run('delete-user', async () => {
    await deleteUser(token, id);
    await elba.users.delete({ ids: [id] });
  });
 }
);

import { getUsers } from '../../connectors/users';
import { db } from '../../database/client';
import { Organisation } from '../../database/schema';
import { inngest } from '../../inngest/client';

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
await getUsers(token,null);
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
  await inngest.send({
   name: 'livestorm/users.page_sync.requested',
   data: {
     isFirstSync: true,
     organisationId,
     region,
     syncStartedAt: Date.now(),
     page: null,
   },
 });
};

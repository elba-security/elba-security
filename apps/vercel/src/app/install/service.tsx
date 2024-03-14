import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  teamId: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  teamId,
  region,
}: SetupOrganisationParams) => {
  await getUsers(token, teamId);
  const [organisation] = await db
    .insert(Organisation)
    .values({ id: organisationId, teamId, region, token })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token,
        teamId,
      },
    })
    .returning();
  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }
  return organisation;
};

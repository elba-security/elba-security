import { addSeconds } from 'date-fns';
import { getAccessToken, refreshAccessToken } from '@/connectors/auth';
import { db, Organisation } from '@/database';
import { inngest } from '@/inngest/client';
import { fetchTeamId } from '@/connectors/team';
import { getHerokuUsers, HerokuPagination, HerokuUser } from '@/connectors/users';


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
  const { accessToken, refreshToken, expiresIn } = await getAccessToken(code);
  // Fetch teamId
  const teamId = await fetchTeamId(accessToken);

  try {
    // Fetch Heroku users and pagination
    const { users, pagination }: { users: HerokuUser[]; pagination: HerokuPagination } = await getHerokuUsers(accessToken, teamId, "id ..; max=1;");
    
    // Log Heroku users
    console.log('Heroku Users:', users);

    // Log pagination information
    console.log('Pagination:');
    console.log(`Next Range: ${pagination.nextRange}`);
  } catch (error) {
    console.error('Error fetching Heroku users:', error);
  }
  
  
  // const [organisation] = await db
  //   .insert(Organisation)
  //   .values({
  //     id: organisationId,
  //     accessToken,
  //     refreshToken,
  //     teamId: team,
  //     region,
  //   })
  //   .onConflictDoUpdate({
  //     target: [Organisation.id],
  //     set: {
  //       id: organisationId,
  //       accessToken,
  //       refreshToken,
  //       teamId: team,
  //       region,
  //     },
  //   })
  //   .returning();

  // await inngest.send([
  //   {
  //     name: 'heroku/token.refresh.requested',
  //     data: {
  //       organisationId,
  //       expiresAt: addSeconds(new Date(), expiresIn).getTime(),
  //     },
  //   },
  //   {
  //     name: 'heroku/users.page_sync.requested',
  //     data: {
  //       isFirstSync: true,
  //       organisationId,
  //       region,
  //       syncStartedAt: Date.now(),
  //       page: null,
  //     },
  //   },
  // ]);
  // return organisation;
};

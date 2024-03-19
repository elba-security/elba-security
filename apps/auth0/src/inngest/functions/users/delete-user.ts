import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { getToken } from '@/connectors/auth';
import { inngest } from '../../client';

export const deleteAuth0User = inngest.createFunction(
  {
    id: 'auth0-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'auth0/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Auth0 organisation
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          clientId: Organisation.clientId,
          clientSecret: Organisation.clientSecret,
          domain: Organisation.domain,
          audience: Organisation.audience,
          sourceOrganizationId: Organisation.sourceOrganizationId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    // get the Auth0 Management API access token
    const accessToken = await step.run('get-token', async () => {
      const tokenResponse = await getToken(
        organisation.clientId,
        organisation.clientSecret,
        organisation.audience,
        organisation.domain
      );
      return tokenResponse.access_token;
    });

    await step.run('delete-user', async () => {
      await deleteUser(accessToken, organisation.domain, organisation.sourceOrganizationId, id);
    });
  }
);

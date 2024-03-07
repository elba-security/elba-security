import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteOpenAiUser = inngest.createFunction(
  {
    id: 'open-ai-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'open-ai/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the OpenAI organisation token
    const [token, sourceOrganizationId] = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({
          token: Organisation.token,
          sourceOrganizationId: Organisation.sourceOrganizationId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      const organisationToken = organisation.token;
      const userOrganizationId = organisation.sourceOrganizationId;
      return [organisationToken, userOrganizationId];
    });

    if (token && sourceOrganizationId) {
      await step.run('delete-user', async () => {
        await deleteUser(token, sourceOrganizationId, id);
      });
    }

    return {
      status: 'completed',
    };
  }
);

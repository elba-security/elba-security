import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';
import { getToken } from '@/connectors/microsoft/auth/auth';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const refreshToken = inngest.createFunction(
  {
    id: 'teams-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    middleware: [unauthorizedMiddleware],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'teams/token.refresh.requested' },
  async ({ event }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({ tenantId: organisationsTable.tenantId })
      .from(organisationsTable)
      .where(and(eq(organisationsTable.id, organisationId)));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { token } = await getToken(organisation.tenantId);

    const encodedToken = await encrypt(token);

    await db
      .update(organisationsTable)
      .set({ token: encodedToken })
      .where(eq(organisationsTable.id, organisationId));
  }
);

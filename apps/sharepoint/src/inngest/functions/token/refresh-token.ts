import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getToken } from '@/connectors/microsoft/auth/tokens';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const refreshToken = inngest.createFunction(
  {
    id: 'sharepoint-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    middleware: [unauthorizedMiddleware],
    cancelOn: [
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'sharepoint/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sharepoint/token.refresh.requested' },
  async ({ event }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        tenantId: organisationsTable.tenantId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { token } = await getToken(organisation.tenantId);

    const encryptedToken = await encrypt(token);

    await db
      .update(organisationsTable)
      .set({ token: encryptedToken })
      .where(eq(organisationsTable.id, organisationId));
  }
);

import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/azuredevops/auth';
import { encrypt, decrypt } from '@/common/crypto';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const refreshToken = inngest.createFunction(
  {
    id: 'azuredevops-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'azuredevops/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'azuredevops/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    middleware: [unauthorizedMiddleware],
    retries: 5,
  },
  { event: 'azuredevops/token.refresh.requested' },
  async ({ event }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({ refreshToken: organisationsTable.refreshToken })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const refreshTokenInfo = await decrypt(organisation.refreshToken);

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await getRefreshToken(refreshTokenInfo);

    const encryptedAccessToken = await encrypt(newAccessToken);
    const encryptedRefreshToken = await encrypt(newRefreshToken);

    await db
      .update(organisationsTable)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      })
      .where(eq(organisationsTable.id, organisationId));
  }
);

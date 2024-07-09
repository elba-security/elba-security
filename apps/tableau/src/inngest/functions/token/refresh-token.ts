import { subMinutes } from 'date-fns/subMinutes';
import { eq, and } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { failureRetry } from '@elba-security/inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt, decrypt } from '@/common/crypto';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';
import { authenticate, getTokenExpirationTimestamp } from '@/connectors/auth';
import { generateToken } from '@/common/jwt';

export const refreshToken = inngest.createFunction(
  {
    id: 'tableau-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'tableau/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'tableau/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    onFailure: failureRetry(),
    middleware: [unauthorizedMiddleware],
    retries: 5,
  },
  { event: 'tableau/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 15));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          id: organisationsTable.id,
          url: organisationsTable.domain,
          secret: organisationsTable.secret,
          secretId: organisationsTable.secretId,
          clientId: organisationsTable.clientId,
          siteId: organisationsTable.siteId,
          email: organisationsTable.email,
          contentUrl: organisationsTable.contentUrl,
        })
        .from(organisationsTable)
        .where(and(eq(organisationsTable.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const decryptedSecret = await decrypt(organisation.secret);

      const { secretId, clientId, email } = organisation;

      const token = await generateToken({ clientId, secretId, email, secret: decryptedSecret });

      const { credentials } = await authenticate({
        token,
        domain: organisation.url,
        contentUrl: organisation.contentUrl,
      });
      const nextExpirationTimestamp = getTokenExpirationTimestamp();

      const encryptedToken = await encrypt(credentials.token);

      await db
        .update(organisationsTable)
        .set({
          token: encryptedToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return nextExpirationTimestamp;
    });

    await step.sendEvent('next-refresh', {
      name: 'tableau/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: nextExpiresAt,
      },
    });
  }
);

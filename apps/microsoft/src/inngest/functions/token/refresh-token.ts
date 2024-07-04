import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { failureRetry } from '@elba-security/inngest';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/microsoft/auth';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const REQUIRED_TOKEN_ROLES = [
  'DelegatedPermissionGrant.ReadWrite.All',
  'Application.ReadWrite.All',
  'User.Read.All',
];

const getTokenRoles = (token: string): string[] => {
  try {
    const details = decodeJwt(token);
    return z.array(z.string()).parse(details.roles);
  } catch (error) {
    logger.error('Could not decode token properly', { error });
    return [];
  }
};

const getTokenMissingRoles = (roles: string[]) =>
  REQUIRED_TOKEN_ROLES.filter((role) => !roles.includes(role));

export const refreshToken = inngest.createFunction(
  {
    id: 'microsoft-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
    middleware: [unauthorizedMiddleware],
    onFailure: failureRetry(),
  },
  { event: 'microsoft/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

    const { nextExpiresAt, tokenRoles } = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          tenantId: organisationsTable.tenantId,
        })
        .from(organisationsTable)
        .where(and(eq(organisationsTable.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const { token, expiresIn } = await getToken(organisation.tenantId);

      const encryptedToken = await encrypt(token);

      await db
        .update(organisationsTable)
        .set({ token: encryptedToken })
        .where(eq(organisationsTable.id, organisationId));

      return {
        nextExpiresAt: addSeconds(new Date(), expiresIn),
        tokenRoles: getTokenRoles(token),
      };
    });

    const tokenMissingRoles = getTokenMissingRoles(tokenRoles);

    if (tokenMissingRoles.length > 0) {
      await step.sendEvent('remove-organisation', {
        name: 'microsoft/app.uninstalled',
        data: {
          organisationId,
        },
      });
      return { status: 'uninstalled' };
    }

    await step.sendEvent('next-refresh', {
      name: 'microsoft/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });

    return { status: 'success' };
  }
);

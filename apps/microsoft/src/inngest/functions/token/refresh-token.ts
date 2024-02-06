import { addMinutes } from 'date-fns/addMinutes';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/auth';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';

export const refreshToken = inngest.createFunction(
  {
    id: 'microsoft/refresh-token',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'microsoft/token.refresh.triggered' },
  async ({ event, step }) => {
    const { organisationId, tenantId, region } = event.data;

    /**
     * Check that the exact same organisation still exists.
     * Organisation admin could re-sign with another region or tenantId.
     */
    const [organisation] = await db
      .select({
        region: Organisation.region,
      })
      .from(Organisation)
      .where(
        and(
          eq(Organisation.id, organisationId),
          eq(Organisation.tenantId, tenantId),
          eq(Organisation.region, region)
        )
      );

    if (!organisation) {
      throw new NonRetriableError(
        `Could not retrieve organisation with id=${organisationId}, tenantId=${tenantId} and region=${region}`
      );
    }

    const { token, expiresIn } = await getToken(tenantId);

    const encodedToken = await encrypt(token);

    await db
      .update(Organisation)
      .set({ token: encodedToken })
      .where(eq(Organisation.id, organisationId));

    await step.sendEvent('schedule-token-refresh', {
      name: 'microsoft/token.refresh.triggered',
      data: {
        organisationId,
        tenantId,
        region,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    });
  }
);

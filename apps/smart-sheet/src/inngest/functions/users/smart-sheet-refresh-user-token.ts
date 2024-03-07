import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { addSeconds, subMinutes } from 'date-fns';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshedToken } from '@/connectors/auth';
import { decrypt, encrypt } from '@/common/crypto';

export const refreshSmartSheetToken = inngest.createFunction(
  {
    id: 'smart-sheet-refresh-user-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 1,
  },

  { event: 'smart-sheet/smart-sheet.token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    // fetch new accessToken & refreshToken using the SaaS endpoint
    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          refreshToken: Organisation.refreshToken,
        })
        .from(Organisation)
        .where(and(eq(Organisation.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await getRefreshedToken(await decrypt(organisation.refreshToken));

      // update organisation accessToken & refreshToken
      await db
        .update(Organisation)
        .set({
          accessToken: await encrypt(newAccessToken),
          refreshToken: await encrypt(newRefreshToken),
        })
        .where(eq(Organisation.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'smart-sheet/smart-sheet.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);

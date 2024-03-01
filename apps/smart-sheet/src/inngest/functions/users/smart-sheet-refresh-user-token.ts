import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { smartSheetRefreshToken } from '@/connectors/auth';

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
  async ({ event }) => {
    /* eslint-disable -- no type here */
    const { organisationId, refreshToken: orgRefreshToken } = event.data;

    // fetch new accessToken & refreshToken using the SaaS endpoint

    const { accessToken, refreshToken, expiresIn } = await smartSheetRefreshToken(
      orgRefreshToken as string
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // update organisation accessToken & refreshToken
    await db
      .update(Organisation)
      .set({
        accessToken,
        refreshToken,
        expiresIn: expiresAt,
      })
      .where(eq(Organisation.id, organisationId));

    return {
      status: 'success',
    };
  }
);

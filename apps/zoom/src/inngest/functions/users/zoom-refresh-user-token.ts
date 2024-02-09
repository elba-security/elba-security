import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { zoomRefreshToken } from '@/connectors/auth';

export const refreshZoomToken = inngest.createFunction(
  {
    id: 'zoom-refresh-user-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },

    retries: 1,
  },
  { event: 'zoom/zoom.token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, refreshToken: orgRefreshToken } = event.data;

    // fetch new accessToken & refreshToken using the SaaS endpoint
    const { accessToken, refreshToken, expiresIn } = await zoomRefreshToken(orgRefreshToken);

    // update organisation accessToken & refreshToken
    await db
      .update(Organisation)
      .set({
        accessToken,
        refreshToken,
        expiresIn,
      })
      .where(eq(Organisation.id, organisationId));

    return {
      status: 'success',
    };
  }
);

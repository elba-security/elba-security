import { eq } from 'drizzle-orm';
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
  async ({ event }) => {
    const { organisationId, refreshToken: orgRefreshToken } = event.data;

    // fetch new accessToken & refreshToken using the SaaS endpoint

    const { accessToken, refreshToken, expiresIn } = await zoomRefreshToken(orgRefreshToken);
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

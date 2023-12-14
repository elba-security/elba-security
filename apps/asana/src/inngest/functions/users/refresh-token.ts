/* eslint-disable camelcase -- conveniency */
import { eq } from 'drizzle-orm';
import { refreshToken, type RefreshTokenResponseData } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const tokenRefresh = inngest.createFunction(
  {
    id: 'refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'token/refresh' },
  async ({ event }) => {
    const { organisationId, refreshTokenInfo } = event.data;

    const { access_token, expires_in }: RefreshTokenResponseData =
      await refreshToken(refreshTokenInfo);
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const updateValue = {
      accessToken: access_token,
      expiresAt,
    };

    await db.update(Organisation).set(updateValue).where(eq(Organisation.id, organisationId));

    return {
      status: 'completed',
    };
  }
);

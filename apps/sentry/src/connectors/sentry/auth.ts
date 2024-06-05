import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { SentryError } from '../common/error';

const tokenResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
});

export const getToken = async (code: string, installationId: string) => {
  const response = await fetch(
    `${env.SENTRY_API_BASE_URL}/sentry-app-installations/${installationId}/authorizations/`,
    {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: env.SENTRY_CLIENT_ID,
        client_secret: env.SENTRY_CLIENT_SECRET,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new SentryError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  // the schema is not correct now
  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Sentry token response', { data });
    throw new SentryError('Invalid Sentry token response', { cause: result.error });
  }

  return {
    accessToken: result.data.token,
    refreshToken: result.data.refreshToken,
    expiresAt: result.data.expiresAt,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string, installationId: string) => {
  const response = await fetch(
    `${env.SENTRY_API_BASE_URL}/sentry-app-installations/${installationId}/authorizations/`,
    {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenInfo,
        client_id: env.SENTRY_CLIENT_ID,
        client_secret: env.SENTRY_CLIENT_SECRET,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new SentryError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid sentry refresh token response', { data });
    throw new Error('Invalid sentry token response', { cause: result.error });
  }

  return {
    accessToken: result.data.token,
    refreshToken: result.data.refreshToken,
    expiresAt: result.data.expiresAt,
  };
};

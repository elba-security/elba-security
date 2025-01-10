import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { FrontError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.FRONT_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.FRONT_CLIENT_ID}:${env.FRONT_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.FRONT_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new FrontError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Frontapp token response', { data });
    throw new FrontError('Invalid Front token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_at,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.FRONT_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.FRONT_CLIENT_ID}:${env.FRONT_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new FrontError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Frontapp token response', { data });
    throw new FrontError('Invalid Front token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_at,
  };
};

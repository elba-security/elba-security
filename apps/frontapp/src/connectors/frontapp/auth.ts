import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { FrontappError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.FRONTAPP_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.FRONTAPP_CLIENT_ID}:${env.FRONTAPP_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.FRONTAPP_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new FrontappError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Frontapp token response', { data });
    throw new FrontappError('Invalid Frontapp token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_at,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.FRONTAPP_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.FRONTAPP_CLIENT_ID}:${env.FRONTAPP_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new FrontappError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Frontapp token response', { data });
    throw new FrontappError('Invalid Frontapp token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_at,
  };
};

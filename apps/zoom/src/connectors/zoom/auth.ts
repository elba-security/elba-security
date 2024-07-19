import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { ZoomError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const encodedKey = btoa(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`);

  const response = await fetch(`${env.ZOOM_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodedKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ZOOM_CLIENT_ID,
      client_secret: env.ZOOM_CLIENT_SECRET,
      redirect_uri: env.ZOOM_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new ZoomError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zoom token response', { data });
    throw new ZoomError('Invalid Zoom token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const encodedKey = btoa(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`);

  const response = await fetch(`${env.ZOOM_APP_INSTALL_URL}/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ZOOM_CLIENT_ID,
      client_secret: env.ZOOM_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      Authorization: `Basic ${encodedKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new ZoomError('Could not refresh token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zoom refresh token response', { data });
    throw new Error('Invalid Zoom token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

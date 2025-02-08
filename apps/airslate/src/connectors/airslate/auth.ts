import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AirslateError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.AIRSLATE_APP_INSTALL_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.AIRSLATE_CLIENT_ID}:${env.AIRSLATE_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.AIRSLATE_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new AirslateError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.parse(data);

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.AIRSLATE_APP_INSTALL_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.AIRSLATE_CLIENT_ID}:${env.AIRSLATE_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new AirslateError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  try {
    const result = tokenResponseSchema.parse(data);
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    };
  } catch (error) {
    logger.error('Invalid Airslate refresh token response', { data, error });
    throw error;
  }
};

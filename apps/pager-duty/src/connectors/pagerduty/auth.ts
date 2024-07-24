import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { PagerdutyError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.PAGERDUTY_APP_INSTALL_URL}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.PAGERDUTY_CLIENT_ID,
      client_secret: env.PAGERDUTY_CLIENT_SECRET,
      redirect_uri: env.PAGERDUTY_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not retrieve token', { response });
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
  const response = await fetch(`${env.PAGERDUTY_APP_INSTALL_URL}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.PAGERDUTY_CLIENT_ID,
      client_secret: env.PAGERDUTY_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  logger.info('Refresh token response', { data });

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Pagerduty refresh token response', {
      data,
      result: JSON.stringify(result, null, 2),
    });
    throw new Error('Invalid Pagerduty token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

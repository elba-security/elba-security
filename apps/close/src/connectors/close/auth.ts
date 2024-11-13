import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { CloseError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  organization_id: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.CLOSE_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.CLOSE_CLIENT_ID,
      client_secret: env.CLOSE_CLIENT_SECRET,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new CloseError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();
  const result = tokenResponseSchema.parse(data);

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
    organizationUri: result.organization_id,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.CLOSE_API_BASE_URL}/oauth2/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.CLOSE_CLIENT_ID}:${env.CLOSE_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new CloseError('Could not retrieve token', { response });
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
    logger.error('Invalid Close refresh token response', { data, error });
    throw error;
  }
};

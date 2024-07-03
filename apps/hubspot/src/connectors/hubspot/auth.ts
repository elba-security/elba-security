import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { HubspotError } from './common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/oauth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.HUBSPOT_CLIENT_ID,
      client_secret: env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: env.HUBSPOT_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new HubspotError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();
  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Hubspot token response', { data });
    throw new HubspotError('Invalid Hubspot token response', { cause: result.error });
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/oauth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.HUBSPOT_CLIENT_ID,
      client_secret: env.HUBSPOT_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new HubspotError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    throw new HubspotError('Could not retrieve token', { response });
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

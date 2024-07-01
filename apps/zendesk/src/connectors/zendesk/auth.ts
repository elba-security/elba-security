import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string, subDomain: string) => {
  const encodedKey = Buffer.from(`${env.ZENDESK_CLIENT_ID}:${env.ZENDESK_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(`${subDomain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedKey}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.ZENDESK_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zendesk token response', { data });
    throw new ZendeskError('Invalid Zendesk token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const encodedKey = Buffer.from(`${env.ZENDESK_CLIENT_ID}:${env.ZENDESK_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(`${env.ZENDESK_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedKey}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  logger.info('Refresh token response', { data });

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zendesk refresh token response', {
      data,
      result: JSON.stringify(result, null, 2),
    });
    throw new Error('Invalid Zendesk token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

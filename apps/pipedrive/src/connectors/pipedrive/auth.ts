import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { PipedriveError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  api_domain: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const encodedString = Buffer.from(
    `${env.PIPEDRIVE_CLIENT_ID}:${env.PIPEDRIVE_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.PIPEDRIVE_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedString}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.PIPEDRIVE_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new PipedriveError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Pipedrive token response', { data });
    throw new PipedriveError('Invalid Pipedrive token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
    apiDomain: result.data.api_domain,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const encodedString = Buffer.from(
    `${env.PIPEDRIVE_CLIENT_ID}:${env.PIPEDRIVE_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.PIPEDRIVE_APP_INSTALL_URL}/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedString}`,
    },
  });

  if (!response.ok) {
    throw new PipedriveError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  logger.info('Refresh token response', { data });

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Pipedrive refresh token response', {
      data,
      result: JSON.stringify(result, null, 2),
    });
    throw new Error('Invalid Pipedrive token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

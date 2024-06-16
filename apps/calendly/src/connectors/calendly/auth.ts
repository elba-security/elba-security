import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { CalendlyError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  organization: z.string(),
  expires_in: z.number(),
});

export const getToken = async (code: string) => {
  const encodedKey = Buffer.from(
    `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.CALENDLY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `${encodedKey}`,
    },
    body: new URLSearchParams({
      client_id: env.CALENDLY_CLIENT_ID,
      client_secret: env.CALENDLY_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: env.CALENDLY_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new CalendlyError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Calendly token response', { data });
    throw new CalendlyError('Invalid Calendly token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
    organizationUri: result.data.organization,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const encodedKey = Buffer.from(
    `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.CALENDLY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `${encodedKey}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new CalendlyError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Jira refresh token response', {
      data,
      result: JSON.stringify(result, null, 2),
    });
    throw new Error('Invalid Calendly token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

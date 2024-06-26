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
  const response = await fetch(`${env.CALENDLY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.CALENDLY_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new CalendlyError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.parse(data);

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
    organizationUri: result.organization,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.CALENDLY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`)}`,
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

  try {
    const result = tokenResponseSchema.parse(data);
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    };
  } catch (error) {
    logger.error('Invalid Calendly refresh token response', { data, error });
    throw error;
  }
};

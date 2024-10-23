import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AzuredevopsError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.AZUREDEVOPS_APP_INSTALL_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: env.AZUREDEVOPS_CLIENT_SECRET,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: code,
      redirect_uri: env.AZUREDEVOPS_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new AzuredevopsError('Could not retrieve token', { response });
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
  const response = await fetch(`${env.AZUREDEVOPS_APP_INSTALL_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: env.AZUREDEVOPS_CLIENT_SECRET,
      grant_type: 'refresh_token',
      assertion: refreshToken,
      redirect_uri: env.AZUREDEVOPS_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new AzuredevopsError('Could not retrieve token', { response });
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
    logger.error('Invalid Azuredevops refresh token response', { data, error });
    throw error;
  }
};

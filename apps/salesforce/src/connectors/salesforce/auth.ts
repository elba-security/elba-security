import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  instance_url: z.string(),
});

const expiresAtResponseSchema = z.object({
  exp: z.number(),
  active: z.boolean(),
});

export type GetExpiresInParams = {
  token: string;
  tokenType: string;
};

export const getToken = async (code: string) => {
  const url = new URL('/services/oauth2/token', env.SALESFORCE_APP_INSTALL_URL);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.SALESFORCE_CLIENT_ID,
      client_secret: env.SALESFORCE_CLIENT_SECRET,
      redirect_uri: env.SALESFORCE_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid salesforce token response', { data });
    throw new SalesforceError('Invalid salesforce token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    instanceUrl: result.data.instance_url,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const url = new URL('/services/oauth2/token', env.SALESFORCE_APP_INSTALL_URL);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.SALESFORCE_CLIENT_ID,
      client_secret: env.SALESFORCE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve refresh token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema
    .omit({
      refresh_token: true,
    })
    .safeParse(data);

  if (!result.success) {
    logger.error('Invalid salesforce token response', { data });
    throw new SalesforceError('Invalid salesforce token response');
  }
  // Refresh token is valid until revoked—Default. The refresh token is used indefinitely, unless revoked by the user or Salesforce admin.
  return {
    accessToken: result.data.access_token,
    instanceUrl: result.data.instance_url,
  };
};

export const getExpiresIn = async ({ token, tokenType }: GetExpiresInParams) => {
  const url = new URL('/services/oauth2/introspect', env.SALESFORCE_APP_INSTALL_URL);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token_type_hint: tokenType,
      client_id: env.SALESFORCE_CLIENT_ID,
      client_secret: env.SALESFORCE_CLIENT_SECRET,
      redirect_uri: env.SALESFORCE_REDIRECT_URI,
      token,
    }).toString(),
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve expires_in', { response });
  }

  const data: unknown = await response.json();

  const result = expiresAtResponseSchema.safeParse(data);

  if (!result.success || !result.data.active) {
    logger.error('Invalid salesforce expires_in response', { data });
    throw new SalesforceError('Invalid salesforce expires_in response');
  }

  return {
    expiresAt: result.data.exp,
  };
};

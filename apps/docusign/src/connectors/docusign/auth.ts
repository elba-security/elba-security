import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { DocusignError } from '../common/error';
import { getUser } from './users';

const docusignTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const accountInfo = z.object({
  account_id: z.string(),
  is_default: z.boolean(),
  account_name: z.string(),
  base_uri: z.string(),
});

const getAccountIdResponseData = z.object({
  sub: z.string(),
  accounts: z.array(accountInfo),
});

const encodedCredentials = btoa(`${env.DOCUSIGN_CLIENT_ID}:${env.DOCUSIGN_CLIENT_SECRET}`);

export const getToken = async (code: string) => {
  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = docusignTokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Docusign token response', { data });
    throw new DocusignError('Invalid Docusign token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedCredentials}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not refresh token', { response });
  }

  const data: unknown = await response.json();
  const result = docusignTokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Docusign token response', { data });
    throw new DocusignError('Invalid Docusign token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getAccountId = async (accessToken: string) => {
  // DOC: https://developers.docusign.com/platform/auth/reference/user-info/
  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/userinfo`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  const data: unknown = await response.json();
  const result = getAccountIdResponseData.safeParse(data);

  if (!result.success || !result.data.accounts.length) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  const baseAccount = result.data.accounts.find((account) => account.is_default);

  if (!baseAccount) {
    throw new DocusignError('Could not retrieve account id or base URI', { response });
  }

  const { isAdmin } = await getUser({
    apiBaseUri: baseAccount.base_uri,
    accessToken,
    accountId: baseAccount.account_id,
    userId: result.data.sub,
  });

  if (isAdmin !== 'True') {
    throw new DocusignError('User is not an admin');
  }

  return {
    accountId: baseAccount.account_id,
    apiBaseUri: baseAccount.base_uri,
  };
};

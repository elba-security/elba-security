/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { DocusignError } from './commons/error';

type GetTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type RefreshTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type AccountInfo = {
  account_id: string;
  is_default: boolean;
  account_name: string;
  base_uri: string;
};
type GetAccountIdResponseData = { accounts: AccountInfo[] };

export const getToken = async (code: string) => {
  const encodedString = Buffer.from(
    `${env.DOCUSIGN_CLIENT_ID}:${env.DOCUSIGN_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedString}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const encodedString = Buffer.from(
    `${env.DOCUSIGN_CLIENT_ID}:${env.DOCUSIGN_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: encodedString,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not refresh token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getAccountId = async (accessToken: string) => {
  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}oauth/userinfo`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  const { accounts } = (await response.json()) as GetAccountIdResponseData;

  if (!accounts[0]) {
    throw new DocusignError('Could not retrieve account id', { response });
  }
  const { account_id: accountId, base_uri: apiBaseURI } = accounts[0];

  return {
    accountId,
    apiBaseURI,
  };
};

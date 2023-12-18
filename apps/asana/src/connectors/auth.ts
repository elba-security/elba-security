import { env } from '@/env';
import { AsanaError } from './commons/error';

export type GetTokenResponseData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  data: { id: string; gid: string; name: string; email: string };
  refresh_token: string;
};
export type RefreshTokenResponseData = {
  access_token: string;
  expires_in: number;
};
export const getToken = async (code: string): Promise<GetTokenResponseData> => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/oauth_token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      redirect_uri: env.ASANA_REDIRECT_URI,
      code,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve token', { response });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- assuming response data type
  return response.json();
};

export const refreshToken = async (refreshTokenInfo: string): Promise<RefreshTokenResponseData> => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/oauth_token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve token', { response });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- assuming response data type
  return response.json();
};

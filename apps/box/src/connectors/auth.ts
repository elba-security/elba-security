import { env } from '@/env';
import { getBoxApiClient } from '@/common/apiclient';

type GetTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type RefreshTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };

export const getToken = async (code: string) => {
  const boxApiClient = getBoxApiClient(); // Instantiate the API client
  const endpoint = `${env.BOX_API_BASE_URL}oauth2/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.BOX_CLIENT_ID,
    client_secret: env.BOX_CLIENT_SECRET,
    code,
  });

  const data = (await boxApiClient.post(endpoint, body)) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const boxApiClient = getBoxApiClient(); // Instantiate the API client
  const endpoint = `${env.BOX_API_BASE_URL}oauth2/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.BOX_CLIENT_ID,
    client_secret: env.BOX_CLIENT_SECRET,
    refresh_token: refreshTokenInfo,
  });

  const data = (await boxApiClient.post(endpoint, body)) as RefreshTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

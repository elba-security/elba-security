import { env } from '@/env';

type GetTokenResponseData = {
  token_type: string;
  expires_in: number;
  created_at: number;
  refresh_token: string;
  access_token: string;
  scope: string;
  owner: string;
  organization: string;
};

export const getAccessToken = async (code: string) => {
  const credentials = `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`;
  const encodedCredentials = btoa(credentials);

  const bodyData = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.CALENDLY_REDIRECT_URI,
  };

  const response = await fetch('https://auth.calendly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    throw new Error('Could not get Calendly access token.');
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
  return tokenData;
};

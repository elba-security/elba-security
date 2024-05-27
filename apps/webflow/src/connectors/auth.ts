import { env } from '@/common/env';
import type { GetTokenResponseData } from './types';

export const getAccessToken = async (code: string) => {
  const url = 'https://api.webflow.com/oauth/access_token';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.WEBFLOW_CLIENT_ID,
      client_secret: env.WEBFLOW_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
  }

  const data = (await response.json()) as GetTokenResponseData;

  return data.access_token;
};

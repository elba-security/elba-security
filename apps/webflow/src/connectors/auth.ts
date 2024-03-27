import { env } from '@/env';
import { WebflowError } from './commons/error';
import { GetTokenResponseData } from './types';

export const getAccessToken = async (code: string) => {
  const response = await fetch(
    `https://api.webflow.com/oauth/access_token?grant_type=authorization_code&code=${code}&client_id=${env.WEBFLOW_CLIENT_ID}&client_secret=${env.WEBFLOW_CLIENT_SECRET}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new WebflowError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data.access_token;
};

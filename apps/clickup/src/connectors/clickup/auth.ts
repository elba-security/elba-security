import { env } from '@/common/env';
import { ClickUpError } from '../commons/error';
import type { GetTokenResponseData } from '../types';

export const getAccessToken = async (code: string) => {
  const response = await fetch(
    `${env.CLICKUP_API_BASE_URL}/oauth/token?client_id=${env.CLICKUP_CLIENT_ID}&client_secret=${env.CLICKUP_CLIENT_SECRET}&code=${code}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new ClickUpError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data.access_token;
};

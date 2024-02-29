import { env } from '@/env';
import { MondayError } from './commons/error';

export type GetTokenResponseData = {
  access_token: string;
  token_type: string;
  scope: string;
};

export const getToken = async (code: string): Promise<GetTokenResponseData> => {
  const response = await fetch('https://auth.monday.com/oauth2/token', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      client_id: env.MONDAY_CLIENT_ID,
      client_secret: env.MONDAY_CLIENT_SECRET,
      code,
      redirect_uri: env.MONDAY_REDIRECT_URL,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data;
};

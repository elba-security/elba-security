import { env } from '@/env';
import { AsanaError } from './commons/error';

export type GetTokenResponseData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  data: { id: string; gid: string; name: string; email: string };
  refresh_token: string;
};

export const getToken = async (code: string): Promise<GetTokenResponseData> => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/oauth_token`, {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      redirect_uri: env.ASANA_REDIRECT_URI,
      code,
    }),
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

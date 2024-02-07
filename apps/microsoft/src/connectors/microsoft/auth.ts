import { env } from '@/env';
import { MicrosoftError } from './commons/error';

type GetTokenResponseData = { access_token: string; expires_in: number };

export const getToken = async (tenantId: string) => {
  const response = await fetch(`${env.MICROSOFT_AUTH_API_URL}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    token: data.access_token,
    expiresIn: data.expires_in,
  };
};

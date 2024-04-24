import { Auth0Error } from './commons/error';

type GetTokenResponseData = {
  access_token: string;
  scope: string;
  expires_in: string;
  token_type: string;
};

export const getToken = async (
  clientId: string,
  clientSecret: string,
  audience: string,
  domain: string
) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    audience,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Auth0Error('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data;
};

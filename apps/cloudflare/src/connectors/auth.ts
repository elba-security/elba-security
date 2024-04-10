/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { CloudflareError } from './commons/error';

type GetVarificationResponseData = { success: boolean };

export const getVerification = async (authEmail: string, authKey: string) => {
  const response = await fetch('https://api.cloudflare.com/client/v4/user', {
    method: 'GET',
    headers: {
      'X-Auth-Email': authEmail,
      'X-Auth-Key': authKey,
    },
  });

  if (!response.ok) {
    throw new CloudflareError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetVarificationResponseData;
  return data;
};

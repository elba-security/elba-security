/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { MySaasError } from './commons/error';

type GetTokenResponseData = { token: string };

export const getToken = async (code: string) => {
  const response = await fetch('https://mysaas.com/api/v1/token', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new MySaasError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data.token;
};

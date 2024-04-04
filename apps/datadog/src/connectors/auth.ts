/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { DatadogError } from './commons/error';

type GetVarificationResponseData = { valid: boolean };

export const getVarification = async (apiKey: string) => {
  const response = await fetch('https://api.datadoghq.com/api/v1/validate', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    },
  });

  if (!response.ok) {
    throw new DatadogError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetVarificationResponseData;
  return data;
};

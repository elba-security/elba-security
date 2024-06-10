/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { HubspotError } from './commons/error';

type GetAccountResponseData =  {
  portalId: string;
  timeZone: string;
};

export const getAccountTimezone = async (token: string) => {

  const response = await fetch(`https://api.hubapi.com/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new HubspotError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetAccountResponseData;
  return data.timeZone;
};

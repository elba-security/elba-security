/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { HubspotError } from './commons/error';

export type HubspotUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Paging = {
  next?:{
    link: string,
    after: string
  }
}
type GetUsersResponseData = { results: HubspotUser[]; paging?: Paging | null };

export const getUsers = async (token: string, page: string | null) => {

  const response = await fetch(
    `https://api.hubapi.com/crm/v3/owners/?idProperty=userId&archived=false&limit=100${page ? `&after=${page}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) {
    throw new HubspotError('Could not retrieve users', { response });
  }
  const data = await response.json() as Promise<GetUsersResponseData>;
  return data;
};

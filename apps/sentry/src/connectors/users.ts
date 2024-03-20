/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { MySaasError } from './commons/error';

export type MySaasUser = {
  id: string;
  username: string;
  email: string;
};

type GetUsersResponseData = { users: MySaasUser[]; nextPage: number | null };

export const getUsers = async (token: string, page: number | null) => {
  const response = await fetch(`https://mysaas.com/api/v1/users?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new MySaasError('Could not retrieve users', { response });
  }
  return response.json() as Promise<GetUsersResponseData>;
};

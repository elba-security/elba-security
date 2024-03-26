import { ApolloError } from './commons/error';

export type ApolloUser = {
  id: string;
  name: string;
  email: string;
};

export type Pagination = {
  page: string;
  per_page: number;
  total_entries: number;
  total_pages: number;
};

type GetUsersResponseData = { users: ApolloUser[]; pagination: Pagination };

export const getUsers = async (token: string, page: string | null) => {
  const url = new URL(`https://api.apollo.io/v1/users/search`);
  url.searchParams.append('api_key', token);

  if (page !== null) {
    url.searchParams.append('page', page);
  }

  const response = await fetch(url);

  if (!response.ok && response.status !== 404) {
    throw new ApolloError('Could not retrieve users', { response });
  }

  const data = (await response.json()) as GetUsersResponseData;
  return data;
};
export const deleteUser = async (token: string, userId: string) => {
  const response = await fetch(`https://api.apollo.io/v1/users/${userId}/?api_key=${token}`, {
    method: 'DELETE',
  });
  // Check if response is successful (status 200) or user not found (status 404)
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not delete user with Id: ${userId}`);
  }
};

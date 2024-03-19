import { ApolloError} from './commons/error';

export type ApolloUser = {
  id: string;
  name: string;
  email: string;
};

export type Pagination = {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
};

type GetUsersResponseData = {users: ApolloUser[]; pagination: Pagination;};

export const getUsers = async (token: string, page: number|null) => {
  const url = new URL(`https://api.apollo.io/v1/users/search`);
  url.searchParams.append('api_key', token);

  if (page !== null) {
    url.searchParams.append('page', page.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok && response.status !== 404) {
    throw new ApolloError('Could not retrieve users',{response});
  }

  const data = (await response.json()) as GetUsersResponseData;
  return data;
};

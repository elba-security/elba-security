/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { MondayError } from './commons/error';

export type MondayUser = {
  id: string;
  name: string;
  email: string;
};

type GetUsersResponseData = { data: { users: MondayUser[] }, nextPage: number | null };

export const getUsers = async (token: string, page: number | null) => {
  const response = await fetch(`https://api.monday.com/v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      "query": `query {users (limit:50 page:${page}) {email id name }}`
    })
  });
  if (!response.ok) {
    throw new MondayError('Could not retrieve users', { response });
  }
  var data = await response.json()
  if (data.data && data.data.users.length == 0)
    page = null
  else
    page = typeof page === 'number' ? page + 1 : 1;
  const responseData: GetUsersResponseData = {
    data: data.data,
    nextPage: page
  };
  return responseData;
};

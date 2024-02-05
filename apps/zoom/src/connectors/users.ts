/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { MySaasError } from './commons/error';

export type MySaasUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  pmi: string;
  phone_number: string;
  role_id: number;
};

type GetUsersResponseData = {
  users: MySaasUser[];
  nextPage: { page_count: number; page_number: number; total_records: number };
};

export const getUsers = async (token: string, page: number | null) => {
  // console.log('Get User fn Hit');
  const response = await fetch(`${env.ZOOM_API_URL}/users?page_number=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new MySaasError('Could not retrieve users', { response });
  }
  // console.log('🚀 ~ file: users.ts:40 ~ getUsers ~ response.json():', response.json());
  // console.log(
  //   '🚀 ~ file: users.ts:40 ~ getUsers ~ response.json():',
  //   response.json() as Promise<GetUsersResponseData>
  // );

  return response.json() as Promise<GetUsersResponseData>;
};

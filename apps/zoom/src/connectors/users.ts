/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { ZoomError } from './commons/error';

export type ZoomUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  pmi: string;
  phone_number: string;
  role_id: number;
};

export type GetUsersResponseData = {
  users: ZoomUser[];
  page_number: number;
  page_size: number;
  total_record: number;
  next_page_token: string | null;
};

export const getUsers = async (token: string, page: string | null) => {
  const zoomUrl = new URL(`${env.ZOOM_API_URL}/users`);
  zoomUrl.searchParams.append('page_size', '2');

  if (page !== null) {
    zoomUrl.searchParams.append('next_page_token', page);
  }
  let response: Response;
  try {
    response = await fetch(zoomUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok || response.status === 401) {
      throw new ZoomError('Could not retrieve users', {
        response,
      });
    }

    const data = (await response.json()) as Promise<GetUsersResponseData>;

    return data;
  } catch (error) {
    throw new ZoomError('Could not retrieve users', { response });
  }
};

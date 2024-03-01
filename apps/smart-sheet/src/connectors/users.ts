/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { SmartSheetError } from './commons/error';

export type SmartSheetUser = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  admin: boolean;
  licensedSheetCreator: boolean;
  groupAdmin: boolean;
  resourceViewer: boolean;
  id: string;
  status: 'ACTIVE' | 'DEACTIVE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  sheetCount: number;
};

export type GetUsersResponseData = {
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount?: number;
  data: SmartSheetUser[];
};

export const getUsers = async (token: string, page: number) => {
  const smartSheetUrl = new URL(`${env.SMART_SHEET_API_URL}users`);
  smartSheetUrl.searchParams.append('pageSize', '1');

  smartSheetUrl.searchParams.append('page', `${page}`);

  const response = await fetch(smartSheetUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new SmartSheetError('Could not retrieve users', {
      response,
    });
  }

  const data = (await response.json()) as Promise<GetUsersResponseData>;

  return data;
};

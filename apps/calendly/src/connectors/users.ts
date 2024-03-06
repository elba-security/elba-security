/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '../env';
import { CalendlyError } from './commons/error';

export type CalendlyUser = {
  id: string;
  name: string;
  email: string;
};

export type Pagination = {
  next_page: string | null;
  next_page_token: string | null;
  previous_page: string | null;
  previous_page_token: string | null;
};

type GetOrganizationMembersResponseData = { members: CalendlyUser[]; nextPage: Pagination };

export const getOrganizationMembers = async (token: string, page: string | null) => {
  const response = await fetch(
    `https://api.calendly.com/organization_memberships?pagination_count=${env.USERS_SYNC_BATCH_SIZE}&page_token=${page}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new CalendlyError('Could not retrieve organization members', { response });
  }
  return response.json() as Promise<GetOrganizationMembersResponseData>;
};

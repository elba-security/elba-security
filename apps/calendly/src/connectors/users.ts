import { env } from '../env';
import { CalendlyError } from './commons/error';

export type CalendlyUser = {
  role: string;
  uri: string;
  user: { name: string; email: string };
};

export type Pagination = {
  count: number;
  next_page: string | null;
  next_page_token: string | null;
  previous_page: string | null;
  previous_page_token: string | null;
};

type GetOrganizationMembersResponseData = { collection: CalendlyUser[]; pagination: Pagination };

export const getOrganizationMembers = async (
  token: string,
  organization: string,
  pageToken: string | null
) => {
  const response = await fetch(
    `https://api.calendly.com/organization_memberships?organization=${organization}${
      pageToken !== null ? `&count=${env.USERS_SYNC_BATCH_SIZE}&page_token=${pageToken}` : ''
    }`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new CalendlyError('Could not retrieve organization members', { response });
  }
  const data = (await response.json()) as GetOrganizationMembersResponseData;
  return data;
};

export const deleteUser = async (token: string, uri: string) => {
  const response = await fetch(uri, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new CalendlyError(`Could not delete user: ${uri}`, { response });
  }
};

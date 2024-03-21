import { SentryError } from './commons/error';

export type SentryUser = {
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type Pagination = {
  nextCursor: string | null;
};

type GetUsersResponseData = { users: SentryUser[]; pagination: Pagination };

export const getUsers = async (
  token: string,
  organizationSlug: string,
  cursor: string | null
) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const url = `https://sentry.io/api/0/organizations/${organizationSlug}/members/?per_page=1${
    cursor ? `&cursor=${cursor}` : ''
  }`;

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new SentryError('Could not retrieve Sentry organization members', { response });
  }

  const data = (await response.json()) as SentryUser[];

  const pagination: Pagination = {
    nextCursor: null,
  };

  const linkHeader = response.headers.get('Link');
  if (linkHeader) {
    const match = /<(?<url>[^>]+)>/.exec(linkHeader);
    if (match && match.groups && match.groups.url) {
      const parsedUrl = new URL(match.groups.url);
      pagination.nextCursor = parsedUrl.searchParams.get('cursor');
    }
  }

  return { members: data, pagination };
};

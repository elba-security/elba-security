import { env } from '@/env';
import { SentryError } from './commons/error';

export type SentryUser = {
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    has2fa: boolean;
  };
};

export type Pagination = {
  nextCursor: string | null;
};

export const getUsers = async (token: string, organizationSlug: string, cursor: string | null) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const SENTRY_BASE_URL = 'https://sentry.io/api/0/';
  const url = `${SENTRY_BASE_URL}organizations/${organizationSlug}/members/?per_page=${
    env.USERS_SYNC_BATCH_SIZE
  }${cursor ? `&cursor=${cursor}` : ''}`;

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
    if (match?.groups?.url) {
      const parsedUrl = new URL(match.groups.url);
      pagination.nextCursor = parsedUrl.searchParams.get('cursor');
    }
  }

  return { members: data, pagination };
};
export const deleteUser = async (token: string, organizationSlug: string, memberId: string) => {
  const url = `https://api.sentry.io/api/0/organizations/${organizationSlug}/members/${memberId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new SentryError('Could not delete Sentry user', { response });
  }
};

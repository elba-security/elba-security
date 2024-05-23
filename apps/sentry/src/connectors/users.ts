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

  const url = `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/?per_page=${
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
  let nextCursor: string | null = null;
  if (linkHeader) {
    const links = linkHeader.split(', ');
    const nextLink = links.find(link => link.includes('rel="next"'));
    if (nextLink) {
      const match = /<(?<url>[^>]+)>/.exec(nextLink);
      if (match?.groups?.url) {
        const parsedUrl = new URL(match.groups.url);
        nextCursor = parsedUrl.searchParams.get('cursor');
      }
    }
  }
  if(data.length === env.USERS_SYNC_BATCH_SIZE){
    pagination.nextCursor = nextCursor;
  }

  return { members: data, pagination };
};

export const deleteUser = async (token: string, organizationSlug: string, memberId: string) => {
  const url = `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/${memberId}/`;

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

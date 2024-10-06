import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { ConnectorError } from '@elba-security/next-elba/connector-error';
import { type User } from '@elba-security/sdk';
import { env } from '../env';

// extract uuid from user's unique uri like this: "https://api.calendly.com/organization_memberships/AAAAAAAAAAAAAAAA"
const extractUUID = (user: CalendlyUser): string => {
  const regex = /organization_memberships\/(?<uuid>[a-f0-9-]{36})/;
  const match = regex.exec(user.uri);
  return match?.groups?.uuid ? match.groups.uuid : user.user.email;
};

const formatElbaUser = ({
  user,
  authUserUri,
}: {
  user: CalendlyUser;
  authUserUri: string;
}): User => ({
  id: extractUUID(user),
  displayName: user.user.name,
  email: user.user.email,
  role: user.role,
  additionalEmails: [],
  isSuspendable: user.user.uri !== authUserUri && user.role !== 'owner',
  url: 'https://calendly.com/app/admin/users',
});

const calendlyUserSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
    uri: z.string(),
  }),
  uri: z.string(),
  role: z.string(),
});

export type CalendlyUser = z.infer<typeof calendlyUserSchema>;

const calendlyResponseSchema = z.object({
  collection: z.array(z.unknown()),
  pagination: z.object({
    next_page_token: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  organizationUri: string;
  authUserUri: string;
  cursor?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({
  accessToken,
  organizationUri,
  authUserUri,
  cursor,
}: GetUsersParams) => {
  const url = new URL(`${env.CALENDLY_API_BASE_URL}/organization_memberships`);

  url.searchParams.append('organization', organizationUri);
  url.searchParams.append('count', `${env.CALENDLY_USERS_SYNC_BATCH_SIZE}`);

  if (cursor) {
    url.searchParams.append('page_token', cursor);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ConnectorError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = calendlyResponseSchema.parse(resData);

  const validUsers: CalendlyUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.collection) {
    const userResult = calendlyUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  logger.warn('Response contains invalid users', { invalidUsers });

  return {
    users: validUsers.map((user) => formatElbaUser({ user, authUserUri })),
    nextCursor: result.pagination.next_page_token ?? null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.CALENDLY_API_BASE_URL}/organization_memberships/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new ConnectorError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const authUserIdResponseSchema = z.object({
  resource: z.object({
    uri: z.string(),
  }),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.CALENDLY_API_BASE_URL}/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ConnectorError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Calendly auth user response', { resData });
    throw new ConnectorError('Invalid Calendly auth user response');
  }

  return {
    authUserUri: String(result.data.resource.uri),
  };
};

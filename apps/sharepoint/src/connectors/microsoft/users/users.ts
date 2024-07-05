import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { microsoftPaginatedResponseSchema } from '../common/pagination';

const userSchema = z.object({
  id: z.string(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string(),
  displayName: z.string().nullable().optional(),
});

export type MicrosoftUser = z.infer<typeof userSchema>;

export type GetUsersParams = {
  token: string;
  tenantId: string;
  skipToken: string | null;
};

export const getUsers = async ({ token, tenantId, skipToken }: GetUsersParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/${tenantId}/users`);
  url.searchParams.append('$top', String(env.USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', Object.keys(userSchema.shape).join(','));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse users', { data, error: result.error });
    throw new Error('Could not parse users');
  }

  const validUsers: MicrosoftUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.data.value) {
    const parsedUser = userSchema.safeParse(user);
    if (parsedUser.success) {
      validUsers.push(parsedUser.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const nextSkipToken = result.data['@odata.nextLink'];

  return { validUsers, invalidUsers, nextSkipToken };
};

import { env } from '@/common/env/server';
import { type MicrosoftUser } from '../types';
import { MicrosoftError } from '../common/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../common/pagination';
import { userSchema } from '../schemes';

export type GetUsersParams = {
  token: string;
  tenantId: string;
  skipToken: string | null;
};

export const getUsers = async ({ token, tenantId, skipToken }: GetUsersParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/${tenantId}/users`);
  url.searchParams.append('$top', String(env.USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', 'id,mail,userPrincipalName,displayName,userType');
  url.searchParams.append('$filter', "userType eq 'Member'");

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

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validUsers: MicrosoftUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data.value) {
    const result = userSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { validUsers, invalidUsers, nextSkipToken };
};

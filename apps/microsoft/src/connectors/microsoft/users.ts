import { z } from 'zod';
import { zSegregate } from '@elba-security/zod';
import { env } from '@/env';
import { MicrosoftError } from './commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from './commons/pagination';

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
  url.searchParams.append('$select', 'id,mail,userPrincipalName,displayName');
  url.searchParams.append('$filter', 'accountEnabled eq true');

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

  const users = zSegregate(userSchema).parse(data.value);

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { validUsers: users.valids, invalidUsers: users.invalids, nextSkipToken };
};

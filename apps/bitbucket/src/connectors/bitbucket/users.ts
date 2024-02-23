import { z } from 'zod';
import { BitbucketError } from '../commons/error';
import { zPaginatedResponse } from '../commons/types';

const zUserSchema = z.object({
  display_name: z.string(),
  account_id: z.string(),
});

const zWorkspaceMembershipResonse = zPaginatedResponse.extend({
  values: z.array(
    z.object({
      user: zUserSchema,
    })
  ),
});

export type BitbucketUser = {
  accountId: string;
  displayName: string;
};

type GetUsersParams = {
  accessToken: string;
  workspaceId: string;
  nextUrl: string | null;
};

export const getUsers = async ({ accessToken, workspaceId, nextUrl }: GetUsersParams) => {
  const url = new URL(nextUrl || `https://api.bitbucket.org/2.0/workspaces/${workspaceId}/members`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve users', { response });
  }

  const membershipResponse = zWorkspaceMembershipResonse.safeParse(await response.json());

  if (!membershipResponse.success) {
    throw new BitbucketError('Error parsing workspace members api response', {
      error: membershipResponse.error,
    });
  }

  const users = membershipResponse.data.values.map((m) => ({
    accountId: m.user.account_id,
    displayName: m.user.display_name,
  }));

  return { users, nextUrl: membershipResponse.data.next || null };
};

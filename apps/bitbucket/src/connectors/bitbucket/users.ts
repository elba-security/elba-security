import { z } from 'zod';
import { env } from '@/common/env';
import { BitbucketError } from '../common/error';

const getUsersResponseSchema = z.object({
  values: z.array(z.unknown()),
  next: z.string().optional(),
});

export const bitbucketUserSchema = z.object({
  user: z.object({
    display_name: z.string(),
    uuid: z.string(),
  }),
  workspace: z.object({
    slug: z.string(),
  }),
});

export type BitbucketUser = z.infer<typeof bitbucketUserSchema>;

type GetUsersParams = {
  accessToken: string;
  workspaceId: string;
  page?: string | null;
};

export const getUsers = async ({ accessToken, workspaceId, page }: GetUsersParams) => {
  const url = new URL(`${env.BITBUCKET_API_BASE_URL}/workspaces/${workspaceId}/members`);
  url.searchParams.append('pagelen', `${env.BITBUCKET_USERS_SYNC_BATCH_SIZE}`);

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = getUsersResponseSchema.parse(resData);

  const validUsers: BitbucketUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.values) {
    const userResult = bitbucketUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.next ?? null,
  };
};

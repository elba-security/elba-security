import { z } from 'zod';
import { BitbucketError } from '@/connectors/common/error';
import { env } from '@/common/env';

export const workspaceSchema = z.object({
  uuid: z.string(),
  name: z.string(),
});

const getWorkspacesSchema = z.object({
  values: z.array(workspaceSchema).nonempty(),
});

export const getWorkspaces = async (token: string) => {
  const response = await fetch(`${env.BITBUCKET_API_BASE_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new BitbucketError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new BitbucketError('Invalid workspace data structure', { response });
  }

  return result.data.values;
};

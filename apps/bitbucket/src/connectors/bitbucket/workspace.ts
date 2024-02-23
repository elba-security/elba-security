import { z } from 'zod';
import { BitbucketError } from '../commons/error';
import { zPaginatedResponse } from '../commons/types';

const zWorkspaceSchema = z.object({
  uuid: z.string(),
});

export const getWorkspace = async (accessToken: string) => {
  const url = new URL('https://api.bitbucket.org/2.0/workspaces');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve users', { response });
  }

  const parsedResponse = zPaginatedResponse.safeParse(await response.json());

  if (!parsedResponse.success) {
    throw new BitbucketError('Error parsing workspace api response', {
      error: parsedResponse.error,
    });
  }

  const workspace = zWorkspaceSchema.safeParse(parsedResponse.data.values[0]);

  if (!workspace.success) {
    throw new BitbucketError('Error parsing workspace', {
      error: workspace.error,
    });
  }

  return workspace.data;
};

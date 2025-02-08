import { z } from 'zod';
import { AirslateError } from '@/connectors/common/error';
import { env } from '@/common/env';

export const workspaceSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
});

const getWorkspacesSchema = z.object({
  data: z.array(workspaceSchema).nonempty(),
});

export const getWorkspaces = async (token: string) => {
  const perPage = 200;
  const response = await fetch(`${env.AIRSLATE_API_BASE_URL}/organizations?per_page=${perPage}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new AirslateError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new AirslateError('Invalid workspace data structure', { response });
  }

  return result.data.data;
};

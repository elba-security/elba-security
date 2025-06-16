import { z } from 'zod';
import { env } from '@/common/env';
import { TypeformConnectionError } from './commons/errors';

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  forms: z.object({
    count: z.number(),
    href: z.string(),
  }),
  self: z.object({
    href: z.string(),
  }),
  account_id: z.string().optional(),
  default: z.boolean().optional(),
  shared: z.boolean().optional(),
  members: z
    .array(
      z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['owner', 'member']),
        user: z
          .object({
            id: z.string(),
            email: z.string().email(),
            name: z.string(),
          })
          .optional(),
        account_member_id: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export type Workspace = z.infer<typeof workspaceSchema>;

const workspacesResponseSchema = z.object({
  items: z.array(workspaceSchema),
  page_count: z.number(),
  total_items: z.number(),
});

export type WorkspacesResponse = z.infer<typeof workspacesResponseSchema>;

export const getWorkspaces = async ({
  accessToken,
  page = 1,
  isEuDataCenter = false,
}: {
  accessToken: string;
  page?: number;
  isEuDataCenter?: boolean;
}) => {
  const baseUrl = isEuDataCenter ? env.TYPEFORM_EU_API_BASE_URL : env.TYPEFORM_API_BASE_URL;
  const url = new URL(`${baseUrl}/workspaces`);
  url.searchParams.append('page', String(page));
  url.searchParams.append('page_size', '200'); // Max allowed by API

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new TypeformConnectionError('unauthorized', 'Invalid access token');
    }
    throw new TypeformConnectionError('unknown', `Failed to fetch workspaces: ${response.status}`);
  }

  const data: unknown = await response.json();
  return workspacesResponseSchema.parse(data);
};

export const getWorkspaceDetails = async ({
  accessToken,
  workspaceId,
  isEuDataCenter = false,
}: {
  accessToken: string;
  workspaceId: string;
  isEuDataCenter?: boolean;
}) => {
  const baseUrl = isEuDataCenter ? env.TYPEFORM_EU_API_BASE_URL : env.TYPEFORM_API_BASE_URL;
  const url = `${baseUrl}/workspaces/${workspaceId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new TypeformConnectionError('unauthorized', 'Invalid access token');
    }
    if (response.status === 404) {
      throw new TypeformConnectionError('unknown', 'Workspace not found');
    }
    throw new TypeformConnectionError(
      'unknown',
      `Failed to fetch workspace details: ${response.status}`
    );
  }

  const data: unknown = await response.json();
  return workspaceSchema.parse(data);
};

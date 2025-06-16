import { z } from 'zod';
import { env } from '@/common/env';
import { getWorkspaces, getWorkspaceDetails } from './workspaces';
import { typeformRateLimiter } from './commons/rate-limiter';
import { TypeformConnectionError } from './commons/errors';

const meResponseSchema = z.object({
  alias: z.string(),
  email: z.string().email(),
  language: z.string(),
  email_verified: z.boolean(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

export const memberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['owner', 'member']),
  workspaceId: z.string(),
  workspaceName: z.string(),
});

export type Member = z.infer<typeof memberSchema>;

type GetUsersParams = {
  accessToken: string;
  isEuDataCenter?: boolean;
  page?: string | null;
};

type UsersResult = {
  validUsers: Member[];
  invalidUsers: unknown[];
  nextPage: string | null;
};

export const getUsers = async ({
  accessToken,
  isEuDataCenter = false,
  page,
}: GetUsersParams): Promise<UsersResult> => {
  // Parse pagination state
  let workspacePage = 1;
  let workspaceIndex = 0;

  if (page) {
    const parts = page.split(':');
    if (parts[0]) {
      workspacePage = parseInt(parts[0], 10) || 1;
    }
    if (parts[1]) {
      workspaceIndex = parseInt(parts[1], 10) || 0;
    }
  }

  const validUsers: Member[] = [];
  const invalidUsers: unknown[] = [];

  // Apply rate limiting
  await typeformRateLimiter.wait();

  // Fetch workspaces
  const workspacesResponse = await getWorkspaces({
    accessToken,
    page: workspacePage,
    isEuDataCenter,
  });

  // Process workspaces starting from workspaceIndex
  const workspacesToProcess = workspacesResponse.items.slice(workspaceIndex);
  let processedCount = 0;

  for (const workspace of workspacesToProcess) {
    // Check if we've reached the batch size limit
    if (validUsers.length >= env.TYPEFORM_USERS_SYNC_BATCH_SIZE) {
      // Return with cursor pointing to current workspace
      const nextPage = `${workspacePage}:${workspaceIndex + processedCount}`;
      return { validUsers, invalidUsers, nextPage };
    }

    try {
      // Apply rate limiting before each workspace detail request
      await typeformRateLimiter.wait();

      // Fetch workspace details with members
      const workspaceDetails = await getWorkspaceDetails({
        accessToken,
        workspaceId: workspace.id,
        isEuDataCenter,
      });

      // Process members if they exist
      if (workspaceDetails.members) {
        let memberIndex = 0;
        for (const member of workspaceDetails.members) {
          // Check if we've reached the batch size limit
          if (validUsers.length >= env.TYPEFORM_USERS_SYNC_BATCH_SIZE) {
            // If we haven't processed all members from this workspace,
            // return to the same workspace on next call
            if (memberIndex > 0) {
              const nextPage = `${workspacePage}:${workspaceIndex + processedCount + 1}`;
              return { validUsers, invalidUsers, nextPage };
            }
            const nextPage = `${workspacePage}:${workspaceIndex + processedCount}`;
            return { validUsers, invalidUsers, nextPage };
          }

          const memberData = {
            email: member.email,
            name: member.name,
            role: member.role,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
          };

          const result = memberSchema.safeParse(memberData);
          if (result.success) {
            validUsers.push(result.data);
          } else {
            invalidUsers.push(memberData);
          }
          memberIndex++;
        }
      }
    } catch (error) {
      // Log workspace processing errors but continue with others
      invalidUsers.push({
        workspaceId: workspace.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    processedCount++;
  }

  // Check if there are more pages of workspaces
  if (workspacePage < workspacesResponse.page_count) {
    return {
      validUsers,
      invalidUsers,
      nextPage: `${workspacePage + 1}:0`,
    };
  }

  // No more data
  return { validUsers, invalidUsers, nextPage: null };
};

export const getAuthUser = async (accessToken: string, isEuDataCenter = false) => {
  const baseUrl = isEuDataCenter ? env.TYPEFORM_EU_API_BASE_URL : env.TYPEFORM_API_BASE_URL;
  const response = await fetch(`${baseUrl}/me`, {
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
    throw new TypeformConnectionError(
      'unknown',
      `Failed to fetch authenticated user: ${response.status}`
    );
  }

  const data: unknown = await response.json();
  return meResponseSchema.parse(data);
};

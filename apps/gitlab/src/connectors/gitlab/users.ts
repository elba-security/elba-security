import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

// GitLab GET /users response schema (based on official API docs)
// These fields are always present in the response
const gitlabUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  state: z.enum(['active', 'blocked', 'deactivated']),
  locked: z.boolean(),
  avatar_url: z.string().nullable(),
  web_url: z.string(),
  // Admin-only fields that might be present
  email: z.string().email().optional(), // Only visible to admins
  created_at: z.string().optional(), // Only visible to admins
  is_admin: z.boolean().optional(), // Only visible to admins
  bot: z.boolean().optional(), // Not documented but seen in practice
  external: z.boolean().optional(), // Optional field
});

export type GitLabUser = z.infer<typeof gitlabUserSchema>;

// GitLab GET /user response schema (authenticated user)
// This endpoint returns more fields than the users list
const gitlabAuthUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(), // Always present for authenticated user
  name: z.string(),
  state: z.enum(['active', 'blocked', 'deactivated']),
  avatar_url: z.string().nullable(),
  web_url: z.string(),
  created_at: z.string(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  public_email: z.string().nullable().optional(),
  skype: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  discord: z.string().optional(),
  organization: z.string().optional(),
  job_title: z.string().optional(),
  // Permission fields
  can_create_group: z.boolean().optional(),
  can_create_project: z.boolean().optional(),
  // Admin status - only present when user is admin
  is_admin: z.boolean().optional(),
  // Other fields we don't need but might be present
  bot: z.boolean().optional(),
  external: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
});

export type GitLabAuthUser = z.infer<typeof gitlabAuthUserSchema>;

// Parameters required to fetch users from GitLab API
type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

/**
 * Fetches users from GitLab API with pagination support
 * @param params - Parameters required to fetch users
 * @returns Object containing valid users, invalid users, and pagination info
 */
export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  // Construct the API URL
  const url = new URL(page || `${env.GITLAB_API_BASE_URL}/api/v4/users`);

  // Add pagination parameters if not already in URL
  if (!page) {
    url.searchParams.set('per_page', String(env.GITLAB_USERS_SYNC_BATCH_SIZE));
    url.searchParams.set('order_by', 'id');
    url.searchParams.set('sort', 'asc');
    // Only get active users
    url.searchParams.set('active', 'true');
    // Don't include blocked users
    url.searchParams.set('blocked', 'false');
  }

  // Make the API request
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  // GitLab returns an array of users directly
  const usersResult = z.array(z.unknown()).safeParse(resData);
  if (!usersResult.success) {
    throw new IntegrationError('Invalid response format', {
      response,
    });
  }

  const validUsers: GitLabUser[] = [];
  const invalidUsers: unknown[] = [];

  // Validate each user and separate valid from invalid ones
  for (const user of usersResult.data) {
    const userResult = gitlabUserSchema.safeParse(user);
    if (userResult.success) {
      // Skip bots
      if (userResult.data.bot === true) {
        continue;
      }
      // Skip external users if needed
      if (userResult.data.external === true) {
        continue;
      }
      // Only include active users (double-check)
      if (userResult.data.state !== 'active') {
        continue;
      }
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  // Parse Link header for pagination
  const linkHeader = response.headers.get('Link');
  let nextPage: string | null = null;

  if (linkHeader) {
    const links = linkHeader.split(',').map((link) => link.trim());
    const nextLink = links.find((link) => link.includes('rel="next"'));
    if (nextLink) {
      const match = /<(?<url>[^>]+)>/.exec(nextLink);
      if (match?.groups?.url) {
        nextPage = match.groups.url;
      }
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

/**
 * Fetches the authenticated user's information
 * Used for validating access tokens and permissions
 */
export const getAuthUser = async (accessToken: string) => {
  const response = await fetch(`${env.GITLAB_API_BASE_URL}/api/v4/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    throw new IntegrationError('Could not retrieve user', { response });
  }

  const resData: unknown = await response.json();

  const userResult = gitlabAuthUserSchema.safeParse(resData);

  if (!userResult.success) {
    throw new IntegrationConnectionError('Invalid auth user data', {
      type: 'unknown',
      metadata: { data: resData, errors: userResult.error.issues },
    });
  }

  // Check if user has admin privileges
  // According to GitLab docs, is_admin is only present when user is admin
  // For non-admin users, the field is not included in the response
  if (userResult.data.is_admin !== true) {
    throw new IntegrationConnectionError('User is not admin', {
      type: 'not_admin',
      metadata: userResult.data,
    });
  }

  return userResult.data;
};

/**
 * Deactivates a user in GitLab
 * Uses the user moderation API endpoint
 * @param accessToken - The access token for authentication
 * @param userId - The ID of the user to deactivate
 */
export const deactivateUser = async (accessToken: string, userId: string) => {
  const response = await fetch(`${env.GITLAB_API_BASE_URL}/api/v4/users/${userId}/deactivate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    if (response.status === 403) {
      // 403 can mean multiple things according to docs:
      // - User lacks admin permissions
      // - User is blocked
      // - User is internal
      // - User is not dormant (hasn't been inactive long enough)
      throw new IntegrationConnectionError(
        'Cannot deactivate user - insufficient permissions or user is not eligible',
        {
          type: 'not_admin',
        }
      );
    }

    if (response.status === 404) {
      // User not found - might already be deleted
      return;
    }

    throw new IntegrationError('Could not deactivate user', { response });
  }

  // According to docs, successful deactivation returns 201
};

import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

// Define the response schema for paginated user data from your source API
// This is an example - adjust according to your source API's response format
const getUsersResponseSchema = z.object({
  // Define the array of users - using unknown initially as we'll validate each user separately
  users: z.array(z.unknown()),
  // Define pagination details - modify based on your source API's pagination mechanism
  pagination: z.object({
    nextPage: z.string().optional(),
  }),
});

// Define the schema for a single user from your source API
// This ensures type safety and validation of user data
const userSchema = z.object({
  // Required fields that match your source API's user object structure
  id: z.string(),
  name: z.string(),
  // Add any other required user fields from your source API
  type: z.string(), // e.g., 'user', 'admin', etc.
});

// Export the complete user schema that includes any additional context
// This is what will be used to validate user data before processing
export const sourceUserSchema = z.object({
  user: userSchema,
  // Add any additional context needed for the user
  metadata: z.object({
    department: z.string().optional(),
  }),
});

// Export the type for use in other parts of the application
export type SourceUser = z.infer<typeof sourceUserSchema>;

// Parameters required to fetch users from your source API
type GetUsersParams = {
  accessToken: string;
  // Add any other required parameters for fetching users
  page?: string | null;
};

/**
 * Fetches users from your source API with pagination support
 * @param params Parameters required to fetch users
 * @returns Object containing valid users, invalid users, and pagination info
 */
export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  // Construct the API URL - replace with your source API endpoint
  const url = new URL(`${env.{{upper name}}_API_BASE_URL}/users`);

  // Add any required query parameters
  url.searchParams.append('limit', `${env.{{upper name}}_USERS_SYNC_BATCH_SIZE}`);

  // Make the API request
  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  // Validate the response structure
  const result = getUsersResponseSchema.parse(resData);

  const validUsers: SourceUser[] = [];
  const invalidUsers: unknown[] = [];

  // Validate each user and separate valid from invalid ones
  for (const user of result.users) {
    const userResult = sourceUserSchema.safeParse(user);
    if (userResult.success) {
      // Add any additional filtering logic here
      if (userResult.data.user.type !== 'user') {
        continue;
      }
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.pagination.nextPage ?? null,
  };
};

/**
 * Fetches the authenticated user's information
 * Used for validating access tokens and permissions
 */
export const getAuthUser = async (accessToken: string) => {
  const response = await fetch(`${env.{{upper name}}_API_BASE_URL}/me`, {
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

  const userResult = userSchema.safeParse(resData);

  if (!userResult.success) {
    throw new IntegrationError('Invalid auth user data', { response });
  }

  // Add any additional validation specific to authenticated users
  if (userResult.data.type !== 'admin') {
    throw new IntegrationConnectionError('User is not admin', { type: 'not_admin' });
  }

  return userResult.data;
};

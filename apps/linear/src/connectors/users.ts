/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { LinearError } from './commons/error';
import { z } from 'zod'; 

// Define the schema for a user using zod for runtime validation
const LinearUserSchema = z.object({
  id: z.string(),
  username: z.string(), // Adjusted to match the response field
  name: z.string(),
  email: z.string().optional(), // Email is optional
});

const LinearResponseSchema = z.object({
  data: z.object({
    users: z.object({
      nodes: z.array(LinearUserSchema),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(), // Ensure this matches the expected type
      }),
    }),
  }),
});

export type GetUsersParams = {
  token: string;
  afterCursor?: string | null;
};

const perPage = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, afterCursor }: GetUsersParams) => {
  console.log("aftercursor", afterCursor)
  const query = {
    query: `
      query($afterCursor: String) {
        users(first: $perPage, after: $afterCursor) {
          nodes {
            id
            username: name
            name: displayName
            email
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      afterCursor: afterCursor ? afterCursor : null,
      perPage
    },
  };

  const url = `${env.LINEAR_API_BASE_URL}graphql`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(query),
  });
  
  if (!response.ok) {
    throw new LinearError('Could not retrieve users', { response });
  }

  
  const jsonResponse = await response.json();
  console.log("jsonResponse:", jsonResponse)

  // Validate response using zod
  const result = LinearResponseSchema.safeParse(jsonResponse);
  if (!result.success) {
    console.log("Validataion errors:", result.error.issues)
    throw new LinearError('Invalid response structure', { response: jsonResponse });
  }

  // Extract data from the validated response
  const users = result.data.data.users.nodes;
  const pageInfo = result.data.data.users.pageInfo;

  return {
    data: users,
    paging: {
      next: pageInfo.hasNextPage ? pageInfo.endCursor : null,
    },
  };
};

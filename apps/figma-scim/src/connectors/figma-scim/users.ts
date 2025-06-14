import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

// SCIM User Schema based on RFC 7643
const scimUserSchema = z.object({
  schemas: z.array(z.string()),
  id: z.string(),
  userName: z.string(),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      formatted: z.string().optional(),
    })
    .optional(),
  displayName: z.string().optional(),
  emails: z
    .array(
      z.object({
        value: z.string().email(),
        primary: z.boolean().optional(),
        type: z.string().optional(),
      })
    )
    .optional(),
  active: z.boolean(),
  meta: z
    .object({
      resourceType: z.string(),
      created: z.string(),
      lastModified: z.string(),
      location: z.string().optional(),
    })
    .optional(),
});

// SCIM List Response Schema
const scimListResponseSchema = z.object({
  schemas: z.array(z.string()),
  totalResults: z.number(),
  startIndex: z.number().optional(),
  itemsPerPage: z.number().optional(),
  Resources: z.array(scimUserSchema),
});

// SCIM Error Response Schema
const scimErrorSchema = z.object({
  schemas: z.array(z.string()),
  detail: z.string().optional(),
  status: z.string().optional(),
  scimType: z.string().optional(),
});

export type ScimUser = z.infer<typeof scimUserSchema>;

type GetUsersParams = {
  apiKey: string;
  tenantId: string;
  startIndex?: number;
  count?: number;
};

/**
 * Fetches users from Figma SCIM API with pagination support
 */
export const getUsers = async ({
  apiKey,
  tenantId,
  startIndex = 1,
  count = 100,
}: GetUsersParams) => {
  const url = new URL(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/${tenantId}/Users`);

  // SCIM pagination parameters
  url.searchParams.append('startIndex', String(startIndex));
  url.searchParams.append('count', String(count));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/scim+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    const errorData: unknown = await response.json().catch(() => null);
    const error = errorData ? scimErrorSchema.safeParse(errorData).data : null;

    throw new IntegrationError(`SCIM API error: ${error?.detail || 'Unknown error'}`, {
      response,
    });
  }

  const resData: unknown = await response.json();
  const result = scimListResponseSchema.parse(resData);

  // Transform SCIM users to Elba format
  const users = result.Resources.filter((user) => user.active) // Only sync active users
    .map((user) => ({
      id: user.id,
      displayName: user.displayName || user.name?.formatted || user.userName,
      email: user.emails?.find((e) => e.primary)?.value || user.emails?.[0]?.value || user.userName,
    }));

  // Calculate next start index for pagination
  const nextStartIndex =
    result.totalResults > startIndex + users.length - 1 ? startIndex + count : undefined;

  return {
    users,
    nextStartIndex,
    totalResults: result.totalResults,
  };
};

type DeleteUserParams = {
  apiKey: string;
  tenantId: string;
  userId: string;
};

/**
 * Deletes (deactivates) a user in Figma via SCIM API
 */
export const deleteUser = async ({ apiKey, tenantId, userId }: DeleteUserParams) => {
  const url = `${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/${tenantId}/Users/${userId}`;

  // SCIM uses PATCH with active: false to deactivate users
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/scim+json',
    },
    body: JSON.stringify({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [
        {
          op: 'replace',
          path: 'active',
          value: false,
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      // User already deleted or doesn't exist - not an error
      return;
    }

    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    const errorData: unknown = await response.json().catch(() => null);
    const error = errorData ? scimErrorSchema.safeParse(errorData).data : null;

    throw new IntegrationError(`Failed to deactivate user: ${error?.detail || 'Unknown error'}`, {
      response,
    });
  }
};

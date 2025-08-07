import { z } from 'zod';
import { OktaError } from '@/connectors/common/error';
import type { OktaUser } from './users';

// Okta Grant schemas
export const oktaGrantSchema = z.object({
  id: z.string(),
  status: z.enum(['ACTIVE', 'REVOKED']),
  created: z.string(),
  lastUpdated: z.string().optional(),
  issuer: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scopeId: z.string(),
  source: z.enum(['ADMIN', 'USER']).optional(),
  _links: z
    .object({
      client: z
        .object({
          href: z.string(),
          title: z.string().optional(),
        })
        .optional(),
      self: z
        .object({
          href: z.string(),
        })
        .optional(),
      user: z
        .object({
          href: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type OktaGrant = z.infer<typeof oktaGrantSchema>;

const grantsResponseSchema = z.array(z.unknown());

// Okta Application schema
export const oktaApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  created: z.string(),
  _links: z.object({
    self: z.object({
      href: z.string(),
    }),
  }),
});

export type OktaApplication = z.infer<typeof oktaApplicationSchema>;

// API function types
export type GetGrantsForUserParams = {
  token: string;
  subDomain: string;
  userId: string;
};

export type GetApplicationParams = {
  token: string;
  subDomain: string;
  appId: string;
};

export type RevokeGrantParams = {
  token: string;
  subDomain: string;
  userId: string;
  grantId: string;
};

// Get all grants for a specific user
export const getGrantsForUser = async ({ token, subDomain, userId }: GetGrantsForUserParams) => {
  const url = `https://${subDomain}.okta.com/api/v1/users/${userId}/grants`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    // If user has no grants, Okta might return 404
    if (response.status === 404) {
      return [];
    }
    throw new OktaError(`Could not retrieve grants for user ${userId}`, { response });
  }

  const resData: unknown = await response.json();
  const resultData = grantsResponseSchema.parse(resData);

  const validGrants: OktaGrant[] = [];
  const invalidGrants: unknown[] = [];

  for (const grant of resultData) {
    const grantResult = oktaGrantSchema.safeParse(grant);
    if (grantResult.success && grantResult.data.status === 'ACTIVE') {
      validGrants.push(grantResult.data);
    } else if (!grantResult.success) {
      invalidGrants.push(grant);
    }
  }

  // Note: invalidGrants are logged but not processed

  return validGrants;
};

// Get application details
export const getApplication = async ({ token, subDomain, appId }: GetApplicationParams) => {
  const url = `https://${subDomain}.okta.com/api/v1/apps/${appId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new OktaError(`Could not retrieve application ${appId}`, { response });
  }

  const resData: unknown = await response.json();
  const result = oktaApplicationSchema.safeParse(resData);

  if (!result.success) {
    throw new OktaError(`Invalid application data structure for ${appId}`, { response });
  }

  return result.data;
};

// Revoke a grant for a user
export const revokeGrant = async ({ token, subDomain, userId, grantId }: RevokeGrantParams) => {
  const url = `https://${subDomain}.okta.com/api/v1/users/${userId}/grants/${grantId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new OktaError(`Could not revoke grant ${grantId} for user ${userId}`, { response });
  }
};

// Get grants for multiple users in parallel with concurrency control
export async function getGrantsForUsers({
  token,
  subDomain,
  users,
  concurrency = 5,
}: {
  token: string;
  subDomain: string;
  users: OktaUser[];
  concurrency?: number;
}) {
  const results: { userId: string; grants: OktaGrant[] }[] = [];

  // Process users in batches to respect concurrency limit
  for (let i = 0; i < users.length; i += concurrency) {
    const batch = users.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (user) => {
        try {
          const grants = await getGrantsForUser({ token, subDomain, userId: user.id });
          return { userId: user.id, grants };
        } catch (error) {
          // Return empty grants for users with errors
          return { userId: user.id, grants: [] };
        }
      })
    );
    results.push(...batchResults);
  }

  return results;
}

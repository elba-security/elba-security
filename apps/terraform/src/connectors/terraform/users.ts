import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

// Terraform API schemas based on documentation
const userAttributesSchema = z.object({
  username: z.string(),
  'avatar-url': z.string().nullable(),
  'is-service-account': z.boolean(),
  'two-factor': z.object({
    enabled: z.boolean(),
  }),
});

const userRelationshipsSchema = z.object({
  'authentication-tokens': z.object({
    links: z.object({
      related: z.string(),
    }),
  }),
});

const userSchema = z.object({
  id: z.string(),
  type: z.literal('users'),
  attributes: userAttributesSchema,
  relationships: userRelationshipsSchema.optional(),
  links: z.object({
    self: z.string(),
  }),
});

const organizationMembershipAttributesSchema = z.object({
  email: z.string().email(),
  username: z.string().nullable(),
  status: z.enum(['invited', 'active']),
});

const organizationMembershipRelationshipsSchema = z.object({
  user: z.object({
    data: z
      .object({
        id: z.string(),
        type: z.literal('users'),
      })
      .nullable(),
  }),
  teams: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        type: z.literal('teams'),
      })
    ),
  }),
  'organization-membership-invitation': z
    .object({
      data: z
        .object({
          id: z.string(),
          type: z.literal('organization-membership-invitations'),
        })
        .nullable(),
    })
    .optional(),
});

const organizationMembershipSchema = z.object({
  id: z.string(),
  type: z.literal('organization-memberships'),
  attributes: organizationMembershipAttributesSchema,
  relationships: organizationMembershipRelationshipsSchema,
  links: z.object({
    self: z.string(),
  }),
});

// Response schema for listing organization memberships
const getOrganizationMembershipsResponseSchema = z.object({
  data: z.array(organizationMembershipSchema),
  included: z.array(userSchema).optional(),
  links: z.object({
    self: z.string(),
    first: z.string(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
    last: z.string(),
  }),
  meta: z.object({
    pagination: z.object({
      'current-page': z.number(),
      'page-size': z.number(),
      'prev-page': z.number().nullable(),
      'next-page': z.number().nullable(),
      'total-pages': z.number(),
      'total-count': z.number(),
    }),
  }),
});

// Export schemas and types
export const terraformOrganizationMembershipSchema = organizationMembershipSchema;
export type TerraformOrganizationMembership = z.infer<typeof organizationMembershipSchema>;
export type TerraformUser = z.infer<typeof userSchema>;

// Parameters required to fetch organization memberships
type GetOrganizationMembershipsParams = {
  accessToken: string;
  organizationName: string;
  page?: number | null;
};

/**
 * Fetches organization memberships from Terraform API with pagination support
 * @param params - Parameters required to fetch memberships
 * @returns Object containing memberships with user data and pagination info
 */
export const getOrganizationMemberships = async ({
  accessToken,
  organizationName,
  page,
}: GetOrganizationMembershipsParams) => {
  const url = new URL(
    `/api/v2/organizations/${organizationName}/organization-memberships`,
    env.TERRAFORM_API_BASE_URL
  );

  // Add pagination parameters
  url.searchParams.append('page[size]', String(env.TERRAFORM_USERS_SYNC_BATCH_SIZE));
  if (page) {
    url.searchParams.append('page[number]', String(page));
  }

  // Include user data in the response
  url.searchParams.append('include', 'user');

  // Filter only active members
  url.searchParams.append('filter[status]', 'active');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve organization memberships', { response });
  }

  const resData: unknown = await response.json();
  const result = getOrganizationMembershipsResponseSchema.parse(resData);

  // Create a map of users for easy lookup
  const usersMap = new Map<string, TerraformUser>();
  if (result.included) {
    for (const user of result.included) {
      usersMap.set(user.id, user);
    }
  }

  // Combine membership and user data
  const membershipsWithUsers = result.data.map((membership) => {
    const userId = membership.relationships.user.data?.id;
    const user = userId ? usersMap.get(userId) : null;
    return {
      membership,
      user,
    };
  });

  return {
    memberships: membershipsWithUsers,
    nextPage: result.meta.pagination['next-page'],
  };
};

/**
 * Deletes a user from the organization
 * @param params - Parameters including access token and membership ID
 */
export const deleteOrganizationMembership = async ({
  accessToken,
  membershipId,
}: {
  accessToken: string;
  membershipId: string;
}) => {
  const url = new URL(
    `/api/v2/organization-memberships/${membershipId}`,
    env.TERRAFORM_API_BASE_URL
  );

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    if (response.status === 404) {
      // User already deleted or doesn't exist
      return;
    }
    throw new IntegrationError('Could not delete organization membership', { response });
  }
};

/**
 * Fetches the authenticated user's information and organization details
 * Used for validating access tokens and getting organization name
 */
export const getAuthenticatedUserOrganization = async (accessToken: string) => {
  // First, we need to get the authenticated user details
  const response = await fetch(`${env.TERRAFORM_API_BASE_URL}/api/v2/account/details`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve account details', { response });
  }

  const resData: unknown = await response.json();

  // Parse the account details response
  const accountDetailsSchema = z.object({
    data: z.object({
      id: z.string(),
      type: z.literal('users'),
      attributes: z.object({
        username: z.string(),
        email: z.string().email(),
        'avatar-url': z.string().nullable(),
        'is-service-account': z.boolean(),
        'two-factor': z.object({
          enabled: z.boolean(),
        }),
      }),
      relationships: z.object({
        organizations: z.object({
          data: z.array(
            z.object({
              id: z.string(),
              type: z.literal('organizations'),
            })
          ),
        }),
      }),
    }),
  });

  const accountResult = accountDetailsSchema.safeParse(resData);
  if (!accountResult.success) {
    throw new IntegrationConnectionError('Invalid account data', {
      type: 'unknown',
      metadata: { data: resData, errors: accountResult.error.issues },
    });
  }

  // Get the first organization (most users have one organization)
  const organizations = accountResult.data.data.relationships.organizations.data;
  if (organizations.length === 0) {
    throw new IntegrationConnectionError('User has no organizations', {
      type: 'not_admin',
    });
  }

  // Return user data and organization name
  const firstOrg = organizations[0];
  if (!firstOrg) {
    throw new IntegrationConnectionError('User has no organizations', {
      type: 'not_admin',
    });
  }

  return {
    userId: accountResult.data.data.id,
    username: accountResult.data.data.attributes.username,
    email: accountResult.data.data.attributes.email,
    organizationName: firstOrg.id, // Organization ID is the name in Terraform
  };
};

import { z } from 'zod';
import { env } from '@/env';
import { createOctokitApp } from './commons/client';

const isNotNull = <T>(input: T | null): input is T => input !== null;

const OrganizationMemberRoleSchema = z.enum(['MEMBER', 'ADMIN']);

const OrganizationMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  login: z.string(),
  role: OrganizationMemberRoleSchema.nullable(),
});

export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

type GetOrganizationMembersQuery = {
  organization: {
    membersWithRole: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges:
        | ({
            role: string | null;
            node: {
              id: string;
              login: string;
              email: string;
              name: string | null;
            } | null;
          } | null)[]
        | null;
    };
  } | null;
};

export const getPaginatedOrganizationMembers = async (
  installationId: number,
  login: string,
  cursor: string | null
) => {
  const app = createOctokitApp();

  const installationOctokit = await app.getInstallationOctokit(installationId);
  const { organization } = await installationOctokit.graphql<GetOrganizationMembersQuery>(
    /* GraphQL */ `
      query GetOrganizationMembers($login: String!, $first: Int, $after: String) {
        organization(login: $login) {
          membersWithRole(first: $first, after: $after) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              role
              node {
                id
                login
                email
                name
              }
            }
          }
        }
      }
    `,
    {
      login,
      first: env.USERS_SYNC_BATCH_SIZE,
      after: cursor,
    }
  );

  if (!organization) {
    throw new Error(`Could not retrieve Github organization with login=${login}`);
  }

  const { edges, pageInfo } = organization.membersWithRole;

  const members =
    edges?.filter(isNotNull).map(({ role, node }) => ({
      role,
      ...node,
    })) ?? [];

  const nextCursor = pageInfo.hasNextPage ? organization.membersWithRole.pageInfo.endCursor : null;

  const validMembers: OrganizationMember[] = [];
  const invalidMembers: typeof members = [];

  for (const member of members) {
    const result = OrganizationMemberSchema.safeParse(member);
    if (result.success) {
      validMembers.push(result.data);
    } else {
      invalidMembers.push(member);
    }
  }

  return { validMembers, invalidMembers, nextCursor };
};

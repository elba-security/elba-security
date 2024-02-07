import { organisations, db } from '@/database';

export type Token = typeof organisations.$inferInsert;

const defaultAccessToken = [
  {
    organisationId: '00000000-0000-0000-0000-000000000010',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    adminTeamMemberId: 'test-team-member-id',
    rootNamespaceId: '123653255',
    region: 'eu',
  },
];

export const insertTestAccessToken = async (tokenDetails: Token[] = defaultAccessToken) => {
  return db.insert(organisations).values(tokenDetails).returning({
    organisationId: organisations.organisationId,
    updatedAt: organisations.updatedAt,
  });
};

export const insertOrganisations = async ({ size = 1 }: { size?: number }) => {
  const tokenPromises = await Array.from({ length: size }, (_, index) => ({
    organisationId: `00000000-0000-0000-0000-00000000000${index + 1}`,
    accessToken: `access-token-${index + 1}`,
  })).map(({ accessToken, organisationId }, idx) => {
    return {
      accessToken,
      organisationId,
      refreshToken: `refresh-token-${idx}`,
      adminTeamMemberId: `admin-team-member-id-1`,
      rootNamespaceId: `root-namespace-id`,
      region: 'eu',
    };
  });

  return await insertTestAccessToken(tokenPromises);
};

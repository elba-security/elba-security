import { tokens, db } from '@/database';
import { addMinutes, addSeconds } from 'date-fns';

const ORGANISATION_ID = '65a9f078-5ab6-4f87-a9e9-cbe91d797562';
const expiresAt = addSeconds(new Date(), 100);

export type Token = typeof tokens.$inferInsert;

const defaultAccessToken = {
  organisationId: ORGANISATION_ID,
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt,
  adminTeamMemberId: 'test-team-member-id',
  rootNamespaceId: '123653255',
  teamName: 'test-team-name',
};

const organisations = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    organisationId: `ce47f296-6d45-4405-ad2b-e279bec5262${index}`,
    accessToken: `access-token-${index}`,
  }));
export const insertTestAccessToken = async (tokenDetails: Token = defaultAccessToken) => {
  try {
    return db
      .insert(tokens)
      .values(tokenDetails)
      .returning({ organisationId: tokens.organisationId, updatedAt: tokens.updatedAt });
  } catch (error) {
    throw error;
  }
};

export const insertOrganisations = async ({
  size = 1,
  expiresAt = [new Date()],
}: {
  size?: number;
  expiresAt?: Date[];
}) => {
  return Promise.all(
    organisations(size).map(({ accessToken, organisationId }, idx) => {
      return insertTestAccessToken({
        accessToken,
        organisationId,
        refreshToken: `refresh-token-${idx}`,
        adminTeamMemberId: `admin-team-member-id-${idx}`,
        expiresAt: addMinutes(expiresAt[idx]!, 240),
        rootNamespaceId: `root-namespace-id-${idx}`,
        teamName: `team-name-${idx}`,
      });
    })
  );
};

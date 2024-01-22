import { tokens, sharedLinks, db } from '@/database';
import { SharedLinks } from '@/repositories/dropbox/types/types';
import { addMinutes, addSeconds } from 'date-fns';

const ORGANISATION_ID = '65a9f078-5ab6-4f87-a9e9-cbe91d797562';
const expiresAt = addSeconds(new Date(), 100);

export type Token = typeof tokens.$inferInsert;

const defaultAccessToken = [
  {
    organisationId: ORGANISATION_ID,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt,
    adminTeamMemberId: 'test-team-member-id',
    rootNamespaceId: '123653255',
    teamName: 'test-team-name',
    region: 'eu',
  },
];

const organisations = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    organisationId: `00000000-0000-0000-0000-00000000000${index + 1}`,
    accessToken: `access-token-${index + 1}`,
  }));

export const insertTestAccessToken = async (tokenDetails: Token[] = defaultAccessToken) => {
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
  expiresAt = Array.from({ length: size }, () => new Date()),
}: {
  size?: number;
  expiresAt?: Date[];
}) => {
  const tokenDetails = organisations(size).map(({ accessToken, organisationId }, idx) => {
    return {
      accessToken,
      organisationId,
      refreshToken: `refresh-token-${idx}`,
      adminTeamMemberId: `admin-team-member-id-1`,
      expiresAt: addMinutes(expiresAt[idx]!, 240),
      rootNamespaceId: `root-namespace-id`,
      teamName: `team-name-${idx}`,
      region: 'eu',
    };
  });

  return await insertTestAccessToken(tokenDetails);
};

export const insertTestSharedLinks = async (
  sharedLinkDetails: Array<SharedLinks & { organisationId: string; teamMemberId: string }>
) => {
  return await db
    .insert(sharedLinks)
    .values(sharedLinkDetails)
    .onConflictDoNothing({
      target: [sharedLinks.url, sharedLinks.pathLower],
    })
    .returning({
      url: sharedLinks.url,
    });
};

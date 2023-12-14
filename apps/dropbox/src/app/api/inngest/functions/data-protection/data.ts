import { db, sharedLinks } from '@/database';
import { SharedLinks } from './types';
import { and, eq, inArray } from 'drizzle-orm';

export const insertSharedLinks = async (sharedLinkDetails: SharedLinks[]) => {
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

export const getSharedLinks = async ({
  organisationId,
  pathLowers,
}: {
  organisationId: string;
  pathLowers: string[];
}) => {
  if (pathLowers.length > 0) {
    return await db
      .select({
        url: sharedLinks.url,
        pathLower: sharedLinks.pathLower,
        teamMemberId: sharedLinks.teamMemberId,
        linkAccessLevel: sharedLinks.linkAccessLevel,
      })
      .from(sharedLinks)
      .where(
        and(
          eq(sharedLinks.organisationId, organisationId),
          inArray(sharedLinks.pathLower, pathLowers)
        )
      );
  }

  return [];
};

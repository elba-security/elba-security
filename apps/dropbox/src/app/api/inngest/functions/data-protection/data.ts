import { db, sharedLinks } from '@/database';
import { SharedLinks } from '@/repositories/dropbox/types/types';
import { and, eq, inArray } from 'drizzle-orm';

type InsertSharedLinks = SharedLinks & {
  teamMemberId: string;
  organisationId: string;
};

export const insertSharedLinks = async (sharedLinkDetails: InsertSharedLinks[]) => {
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

import { SharedLinks } from '@/connectors/types';
import { db, sharedLinks } from '@/database';
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
  linkIds,
}: {
  organisationId: string;
  linkIds: string[];
}) => {
  if (linkIds.length > 0) {
    return await db
      .select({
        id: sharedLinks.id,
        url: sharedLinks.url,
        pathLower: sharedLinks.pathLower,
        linkAccessLevel: sharedLinks.linkAccessLevel,
      })
      .from(sharedLinks)
      .where(and(eq(sharedLinks.organisationId, organisationId), inArray(sharedLinks.id, linkIds)));
  }

  return [];
};

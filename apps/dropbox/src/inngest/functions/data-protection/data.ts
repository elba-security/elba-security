import { and, eq, inArray } from 'drizzle-orm';
import type { SharedLinks } from '@/connectors/types';
import { db, sharedLinks } from '@/database';

type InsertSharedLinks = SharedLinks & {
  teamMemberId: string;
  organisationId: string;
};

export const insertSharedLinks = async (sharedLinkDetails: InsertSharedLinks[]) => {
  return db
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
    return db
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

export const deleteSharedLinks = async (organisationId: string) => {
  return db.delete(sharedLinks).where(eq(sharedLinks.organisationId, organisationId));
};

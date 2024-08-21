import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { filteredSharedLink } from '@/connectors/elba/data-protection/shared-link';
import { db } from './client';
import { sharedLinksTable } from './schema';

const insertSharedLinkSchema = filteredSharedLink.extend({
  teamMemberId: z.string(),
  organisationId: z.string(),
});

export type InsertSharedLink = z.infer<typeof insertSharedLinkSchema>;

export const insertSharedLinks = async (sharedLinkDetails: InsertSharedLink[]) => {
  return await db
    .insert(sharedLinksTable)
    .values(sharedLinkDetails)
    .onConflictDoNothing({
      target: [sharedLinksTable.url, sharedLinksTable.pathLower],
    })
    .returning({
      url: sharedLinksTable.url,
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
        id: sharedLinksTable.id,
        url: sharedLinksTable.url,
        pathLower: sharedLinksTable.pathLower,
        linkAccessLevel: sharedLinksTable.linkAccessLevel,
      })
      .from(sharedLinksTable)
      .where(
        and(
          eq(sharedLinksTable.organisationId, organisationId),
          inArray(sharedLinksTable.id, linkIds)
        )
      );
  }

  return [];
};

export const deleteSharedLinks = async (organisationId: string) => {
  return db.delete(sharedLinksTable).where(eq(sharedLinksTable.organisationId, organisationId));
};

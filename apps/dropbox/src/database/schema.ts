import type { InferSelectModel } from 'drizzle-orm';
import { uuid, text, pgTable, primaryKey } from 'drizzle-orm/pg-core';

export const sharedLinksTable = pgTable(
  'shared_links',
  {
    id: text('id').notNull(),
    url: text('url').notNull(),
    organisationId: uuid('organisation_id').notNull(),
    teamMemberId: text('team_member_id').notNull(),
    linkAccessLevel: text('link_access_level').notNull(),
    pathLower: text('path_lower').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.url, table.pathLower] }),
    };
  }
);

export type SharedLinksDBType = InferSelectModel<typeof sharedLinksTable>;

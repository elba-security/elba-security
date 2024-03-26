import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  accessId: text('accessId').notNull(),
  accessKey: text('accessKey').notNull(),
  sourceRegion: text('sourceRegion').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

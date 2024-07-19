import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accessId: text('access_id').notNull(),
  accessKey: text('access_key').notNull(),
  sourceRegion: text('source_region').notNull(),
  ownerId: text('owner_id').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

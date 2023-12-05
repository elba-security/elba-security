import { uuid, text, timestamp, pgTable, boolean } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  isActivated: boolean('is_activated').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // the following properties are examples, it can removed / replaced to fit your use-case
  token: text('token').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

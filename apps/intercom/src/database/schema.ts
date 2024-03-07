import { uuid, text, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  accessToken: text('accessToken').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

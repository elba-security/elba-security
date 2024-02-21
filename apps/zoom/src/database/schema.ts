import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),

  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // the following properties are examples, it can removed / replaced to fit your use-case

  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),

  // TODO: remove this field + update token refreshing logic
  expiresIn: timestamp('expire_at').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

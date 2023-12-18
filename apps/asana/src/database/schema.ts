import { uuid, text, timestamp, pgTable, bigint } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresIn: bigint('expires_in', { mode: 'number' }).notNull(),
  asanaId: text('asana_id').notNull(),
  gid: text('gid').notNull(),
  webhookSecret: text('webhook_secret'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

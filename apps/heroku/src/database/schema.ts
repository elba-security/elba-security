import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
 id: uuid('id').notNull().primaryKey(),
 accessToken: text('access_token').notNull(),
 refreshToken: text('refresh_token').notNull(),
 teamID: text('team_id').notNull(),
 region: text('region').notNull(),
 createdAt: timestamp('created_at').defaultNow().notNull(),
 updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

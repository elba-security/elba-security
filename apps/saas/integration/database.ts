import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createDb2 } from '../core/database';

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  token: text('token').notNull(),
});

export const databaseClient = createDb2({ organisations });

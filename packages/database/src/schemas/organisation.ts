import { uuid, text, pgTable, timestamp, type PgColumnBuilderBase } from 'drizzle-orm/pg-core';

const baseColumns = {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
};

type ForbiddenKeys<T> = T extends keyof typeof baseColumns
  ? `Error: The column "${T}" is forbidden.`
  : T;

type AllowedColumns = Record<string, PgColumnBuilderBase> & {
  [K in keyof typeof baseColumns]?: ForbiddenKeys<K>;
};

export const extendOrganisationTable = <T extends AllowedColumns>(columns: T) =>
  pgTable('organisations', {
    ...columns,
    ...baseColumns,
  });

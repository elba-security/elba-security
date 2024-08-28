import { type InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  region: text('region').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptionsTable = pgTable(
  'subscriptions',
  {
    organisationId: uuid('organisation_id')
      .references(() => organisationsTable.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    subscriptionExpirationDate: text('subscription_expiration_date').notNull(),
    subscriptionClientState: text('subscription_client_state').notNull(),
    delta: text('delta').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique('unic_user').on(t.organisationId, t.userId),
  })
);

export type Subscription = InferSelectModel<typeof subscriptionsTable>; // TODO delete ?

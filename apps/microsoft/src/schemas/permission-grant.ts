import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organization';

export const permissionGrants = pgTable(
  'permission_grant',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organizations.tenantId),
    userId: text('user_id').notNull(),
    appId: text('app_id').notNull(),
    grantId: text('grant_id').notNull(),
  },
  (t) => ({
    unique: unique().on(t.tenantId, t.userId, t.appId, t.grantId),
  })
);

export type PermissionGrant = InferSelectModel<typeof permissionGrants>;
export type PermissionGrantInsertInput = InferInsertModel<typeof permissionGrants>;

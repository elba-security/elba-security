import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organization', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  elbaOrganizationId: text('elba_organization_id').unique().notNull(),
  tenantId: text('tenant_id').unique().notNull(),
});

export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationInsertInput = InferInsertModel<typeof organizations>;

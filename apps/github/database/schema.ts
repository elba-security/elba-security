import {
  uuid,
  integer,
  pgEnum,
  text,
  index,
  timestamp,
  pgSchema,
  unique,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const GithubSchema = pgSchema('github');

export const Installation = GithubSchema.table(
  'installation',
  {
    id: integer('id').primaryKey(),
    // TODO: support multiple github organization to elba organisation
    elbaOrganizationId: uuid('elba_organisation_id').unique().notNull(),
    accountId: integer('account_id').unique(),
    accountLogin: text('account_login').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('update_at').defaultNow().notNull(),
  },
  (appInstallations) => ({
    organizationIdIdx: index('organisation_id_idx').on(appInstallations.accountId),
    elbaOrganizationIdIdx: index('elba_organization_id_idx').on(
      appInstallations.elbaOrganizationId
    ),
  })
);

export type SelectInstallation = InferSelectModel<typeof Installation>;

export const InstallationAdmin = GithubSchema.table(
  'app_installation_admin',
  {
    installationId: integer('installation_id')
      .references(() => Installation.id)
      .notNull(),
    adminId: text('admin_id').notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('update_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.installationId, t.adminId),
  })
);

export const SyncJobStatusEnum = pgEnum('sync_job_status', ['scheduled', 'started']);

export const SyncJobTypeEnumValues = ['users', 'apps'] as const;
export const SyncJobTypeEnum = pgEnum('sync_job_type', SyncJobTypeEnumValues);

export type SyncJobType = (typeof SyncJobTypeEnumValues)[number];

export const SyncJob = GithubSchema.table(
  'sync_jobs',
  {
    installationId: integer('installation_id')
      .references(() => Installation.id)
      .notNull(),
    status: SyncJobStatusEnum('status').default('scheduled').notNull(),
    type: SyncJobTypeEnum('type').notNull(),
    retryCount: integer('retry_count').default(0).notNull(),
    cursor: text('cursor'),
    syncStartedAt: timestamp('sync_started_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.installationId, t.type),
  })
);

export type SelectSyncJob = InferSelectModel<typeof SyncJob>;

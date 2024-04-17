import type { User } from '@elba-security/sdk';
import type { z } from 'zod';
import type { InferInsertModel, InferModel, InferSelectModel } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import type { ElbaOrganisationsTableBaseKeys, organisationsTable } from './database';

export type BaseElbaOrganisation = Record<string, unknown>;

export type SetOrganisation<Organisation extends BaseElbaOrganisation> = Partial<
  Omit<Organisation, keyof BaseElbaOrganisation>
>;

export type InsertOrganisation<Organisation extends BaseElbaOrganisation> = Omit<
  Organisation,
  keyof BaseElbaOrganisation
>;

export type AuthRouteConfig<
  OrganisationsTable extends typeof organisationsTable,
  SearchParamsSchema extends z.ZodSchema,
  SearchParams = z.infer<SearchParamsSchema>,
> = {
  searchParamsSchema: SearchParamsSchema;
  handle: (
    params: SearchParams
  ) => Omit<PgInsertValue<OrganisationsTable>, ElbaOrganisationsTableBaseKeys>;
};

export type UsersFeaturesConfig<ElbaOrganisation extends BaseElbaOrganisation> = {
  getUsers: (
    organisation: ElbaOrganisation,
    cursor
  ) => {
    users: User[];
    cursor?: string | null;
  };
};

export type Config<Id extends string, OrganisationsTable extends typeof organisationsTable> = {
  id: Id;
  db: { organisations: OrganisationsTable };
  routes?: {
    auth: AuthRouteConfig<OrganisationsTable, z.ZodSchema<Record<string, unknown>>>;
  };
  features?: {
    users: UsersFeaturesConfig<InferSelectModel<OrganisationsTable>>;
  };
};

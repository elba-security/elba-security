import type { DataProtectionObject, User } from '@elba-security/sdk';
import type { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { InngestFunction } from 'inngest';
import type { organisationsTable } from './database';

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
> = {
  searchParamsSchema: SearchParamsSchema;
  withState?: boolean;
  handle: (params: z.infer<SearchParamsSchema>) => {
    organisation: PgUpdateSetSource<OrganisationsTable>;
    tokenExpiresIn?: number;
  };
};

export type UsersFeatureConfig<OrganisationsTable extends typeof organisationsTable> = {
  getUsers: (
    organisation: InferSelectModel<OrganisationsTable>,
    cursor
  ) => {
    users: User[];
    nextCursor?: string | null;
  };
  deleteUser?: (
    organisation: InferSelectModel<OrganisationsTable>,
    userId: string
  ) => Promise<void>;
};

export type DataProtectionFeatureConfig<
  OrganisationsTable extends typeof organisationsTable,
  ObjectMetadataSchema extends z.ZodSchema,
  ObjectPermissionMetadataSchema extends z.ZodSchema,
> = {
  objectMetadataSchema: ObjectMetadataSchema;
  objectPermissionMetadataSchema: ObjectPermissionMetadataSchema;
  deleteObjectPermissions?: (
    organisation: InferSelectModel<OrganisationsTable>,
    objectWithPermissions: unknown // todo merge with schema validation
  ) => Promise<void>;
  deleteObject?: (
    organisation: InferSelectModel<OrganisationsTable>,
    object: unknown // todo merge with schema validation
  ) => Promise<void>;
  refreshObject?: (
    organisation: InferSelectModel<OrganisationsTable>,
    object: unknown // todo merge with schema validation
  ) => Promise<DataProtectionObject>; // the updated object
  getObjectContent?: (
    organisation: InferSelectModel<OrganisationsTable>,
    object: unknown // todo merge with schema validation
  ) => Promise<string | undefined | null>;
};

export type Config<Id extends string> = {
  id: Id;
  inngestFunctions?: InngestFunction.Any[];
  db: {
    client: NeonDatabase<{ organisations: typeof organisationsTable }>;
    organisations: typeof organisationsTable;
  };
  routes?: {
    auth: AuthRouteConfig<typeof organisationsTable, z.ZodSchema<Record<string, unknown>>>;
  };
  features?: {
    users: UsersFeatureConfig<typeof organisationsTable>;
  };
};

import type { DataProtectionObject, User } from '@elba-security/sdk';
import type { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Inngest, InngestFunction } from 'inngest';
import type { organisationsTable } from './database/client';

export type BaseElbaOrganisation = InferSelectModel<typeof organisationsTable>;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- convenience
  T extends Inngest<any> = Inngest<any>,
> = {
  searchParamsSchema: SearchParamsSchema;
  withState?: boolean;
  handle: (params: z.infer<SearchParamsSchema>) => Promise<{
    organisation: Omit<PgInsertValue<OrganisationsTable>, 'id' | 'region'>;
    tokenExpiresIn?: number;
  }>;
  experimental_emitEvents?: (
    organisation: PgInsertValue<OrganisationsTable>
  ) => Parameters<T['send']>[0];
};

export type InstallRouteConfig = {
  redirectUrl: string;
  withState?: boolean;
};

export type TokenFeatureConfig<OrganisationsTable extends typeof organisationsTable> = {
  refreshToken?: (organisation: InferSelectModel<OrganisationsTable>) => Promise<{
    organisation: PgUpdateSetSource<OrganisationsTable>;
    expiresIn: number;
  }>;
};

export type UsersFeatureConfig<OrganisationsTable extends typeof organisationsTable> = {
  getUsers?: (
    organisation: InferSelectModel<OrganisationsTable>,
    cursor: string | null
  ) => Promise<{
    users: User[];
    nextCursor?: string | null;
  }>;
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

export type DatabaseEncryptionConfig = {
  key: string;
  encryptedKeys: string[];
};

export type Config<Id extends string = string> = {
  id: Id;
  elba: {
    apiKey: string;
    redirectUrl: string;
    sourceId: string;
  };
  inngestFunctions?: InngestFunction.Any[];
  database: {
    db: NeonDatabase<{ organisations: typeof organisationsTable }>;
    organisationsTable: typeof organisationsTable;
    encryption?: DatabaseEncryptionConfig;
  };
  routes?: {
    install?: InstallRouteConfig;
    auth?: AuthRouteConfig<typeof organisationsTable, z.ZodSchema<Record<string, unknown>>>;
  };
  features?: {
    token?: TokenFeatureConfig<typeof organisationsTable>;
    users?: UsersFeatureConfig<typeof organisationsTable>;
  };
};

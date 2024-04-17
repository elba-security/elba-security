import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { env } from '../env';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type OrganisationsTableColumns = typeof organisationsTable extends PgTableWithColumns<
  infer C
>
  ? C['columns']
  : never;

export type ElbaOrganisationsTable<OrganisationsColumns extends OrganisationsTableColumns> =
  PgTableWithColumns<{
    name: 'organisations';
    schema: undefined;
    columns: OrganisationsColumns;
    dialect: 'pg';
  }>;

export type ElbaOrganisationsTableBaseKeys = 'id' | 'region' | 'createdAt';

export const createDb2 = <S extends { organisations: typeof organisationsTable }>(schema: S) => {
  let db: NeonDatabase<S>;

  // To have a local neon database like environment as vercel postgres use neon
  // see: https://gal.hagever.com/posts/running-vercel-postgres-locally
  if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
    // Set the WebSocket proxy to work with the local instance
    neonConfig.wsProxy = (host) => `${host}:${env.DATABASE_PROXY_PORT}/v1`;
    // Disable all authentication and encryption
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;

    const pool = new Pool({ connectionString: env.DATABASE_URL });
    db = drizzleNeonServerless(pool, { schema });
  } else {
    // @ts-expect-error -- to make it work locally
    db = drizzleNeonHttp(neon(env.DATABASE_URL), { schema });
  }

  return db;
};

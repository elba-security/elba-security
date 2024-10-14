import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { pgTable } from 'drizzle-orm/pg-core';
import { env } from '../common/env';
import { type ElbaConfig } from '../config';
import { organisationsTableColumns, type ElbaSchema, type TableColumns } from './schema';

const createDatabaseSchema = <T extends TableColumns>(config: ElbaConfig<T>): ElbaSchema => ({
  organisations: pgTable('organisations', {
    // eslint-disable-next-line @typescript-eslint/ban-types --  we do not care of integration specific columns here
    ...(config.database.organisations as {}),
    ...organisationsTableColumns,
  }),
});

export type ElbaDb = NeonDatabase<{
  organisations: ReturnType<typeof pgTable<'organisations', typeof organisationsTableColumns>>;
}>;

export const createDatabase = <T extends TableColumns>(config: ElbaConfig<T>) => {
  const schema = createDatabaseSchema(config);
  let db: NeonDatabase<typeof schema>;

  if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
    neonConfig.wsProxy = (host) => `${host}:${env.DATABASE_PROXY_PORT!}/v1`; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- convenience
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;

    const pool = new Pool({ connectionString: env.DATABASE_URL });
    db = drizzleNeonServerless(pool, { schema });
  } else {
    // @ts-expect-error -- to make it work locally
    db = drizzleNeonHttp(neon(env.DATABASE_URL), { schema });
  }

  return { db, schema };
};

import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { env } from '@/env';
import * as schema from './schema';

// eslint-disable-next-line import/no-mutable-exports -- to make it work locally
let db: NeonDatabase<typeof schema>;

if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:${env.DATABASE_PROXY_PORT}/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  db = drizzleNeonServerless(pool, { schema });
} else {
  // @ts-expect-error -- to make it work locally
  db = drizzleNeonHttp(neon(env.DATABASE_URL), { schema });
}

export { db };

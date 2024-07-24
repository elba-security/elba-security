import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { env } from '@/env';
import * as schema from './schema';

// eslint-disable-next-line import/no-mutable-exports -- to make it work locally
let db: NeonDatabase<typeof schema>;

// To have a local neon database like environment as vercel postgres use neon
// see: https://gal.hagever.com/posts/running-vercel-postgres-locally
if (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') {
  // Set the WebSocket proxy to work with the local instance
  neonConfig.wsProxy = (host) => `${host}:${env.DATABASE_PROXY_PORT!}/v1`; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- convenience
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

export { db };

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from '@/env';
import * as schema from './schema';

if (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:${env.DATABASE_PROXY_PORT}/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

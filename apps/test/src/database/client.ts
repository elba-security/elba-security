import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { neonConfig } from '@neondatabase/serverless';
import { env } from '@/env';
import * as schema from './schema';

if (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') {
  // Set the WebSocket proxy to work with the local instance
  neonConfig.wsProxy = (host) => `${host}:${env.POSTGRES_PROXY_PORT}/v1`;
  // Disable all authentication and encryption
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export const db = drizzle(sql, { schema });

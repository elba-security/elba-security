import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { neonConfig } from '@neondatabase/serverless';
import { env } from '@/common/env';
import * as schema from './schema';

// To have a local neon database like environment as vercel postgres use neon
// see: https://gal.hagever.com/posts/running-vercel-postgres-locally
if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
  // Set the WebSocket proxy to work with the local instance
  neonConfig.wsProxy = (host) => `${host}:${env.POSTGRES_PROXY_PORT}/v1`;
  // Disable all authentication and encryption
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export const db = drizzle(sql, { schema });

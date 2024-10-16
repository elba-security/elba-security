import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { type DatabaseConfig } from './types';

type Database<TSchema extends Record<string, unknown>> = {
  client: NeonDatabase<TSchema> | NeonHttpDatabase<TSchema>;
  tables: { [K in keyof TSchema]: TSchema[K] };
};

export function createDatabase<TSchema extends Record<string, unknown>>(
  config: DatabaseConfig<TSchema>
): Database<TSchema> {
  let client: NeonDatabase<TSchema> | NeonHttpDatabase<TSchema>;

  // To have a local neon database like environment as vercel postgres use neon
  // see: https://gal.hagever.com/posts/running-vercel-postgres-locally
  if (config.environment === 'development') {
    // Set the WebSocket proxy to work with the local instance
    neonConfig.wsProxy = (host) => `${host}:${config.proxy.port}/v1`;
    // Disable all authentication and encryption
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;

    const pool = new Pool({ connectionString: config.url });
    client = drizzleNeonServerless(pool, config.schema);
  } else {
    client = drizzleNeonHttp(neon(config.url), config.schema);
  }

  return {
    client,
    tables: config.schema,
  };
}

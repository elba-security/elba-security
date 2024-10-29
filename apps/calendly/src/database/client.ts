import { createDatabase } from '@elba-security/database';
import { env } from '@/common/env';
import * as schema from './schema';

const { client, tables } = createDatabase({
  environment: env.VERCEL_ENV || 'development',
  url: env.DATABASE_URL,
  proxy: {
    port: env.DATABASE_PROXY_PORT,
  },
  schema,
});

export { client as db, tables };

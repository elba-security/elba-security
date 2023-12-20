/* eslint-disable turbo/no-undeclared-env-vars -- this is a scripts */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { retry, spinner, expBackoff, $ } from 'zx';
import postgres from 'postgres';
import { getEnv } from './env';
import { databaseDockerComposePath } from './config';

export const unmountDatabase = () =>
  spinner('unmount database', () =>
    $`docker-compose -f ${databaseDockerComposePath} -p integration --env-file=.env.local down`.quiet()
  );

export const mountDatabase = () =>
  spinner(
    'mounting database',
    () =>
      $`docker-compose -f ${databaseDockerComposePath} -p integration --env-file=.env.local up -d`
  );

export const unmountTestDatabase = () =>
  spinner('unmount database', () =>
    $`docker-compose -f ${databaseDockerComposePath} -p integration-test --env-file=.env.test down`.quiet()
  );

export const mountTestDatabase = () =>
  spinner(
    'mounting database',
    () =>
      $`docker-compose -f ${databaseDockerComposePath} -p integration-test --env-file=.env.test up -d`
  );

export const applyMigration = () =>
  spinner('applying migration', () =>
    retry(5, expBackoff('3s'), () => {
      const env = getEnv();
      const sql = postgres(env.POSTGRES_URL, { connect_timeout: 5 });

      const db = drizzle(sql);

      return migrate(db, { migrationsFolder: './drizzle' });
    })
  );

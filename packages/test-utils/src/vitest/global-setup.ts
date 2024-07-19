import type { StartedDockerComposeEnvironment } from 'testcontainers';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

let stack: StartedDockerComposeEnvironment | null = null;

export const setup = async () => {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';

  const isEdgeEnvironment = process.env.VITEST_ENVIRONMENT === 'edge-runtime';
  stack = await new DockerComposeEnvironment('../..', 'docker-compose.yaml')
    .withWaitStrategy(
      'postgres',
      Wait.forLogMessage(/.*database system is ready to accept connections.*/, 2)
    )
    .withWaitStrategy('pg_proxy', Wait.forLogMessage(/.*Starting server on port.*/))
    .withProfiles(isEdgeEnvironment ? 'edge' : 'node')
    .up();

  const dbPort = stack.getContainer('postgres-1').getMappedPort(5432);
  if (isEdgeEnvironment) {
    const proxyPort = stack.getContainer('pg_proxy-1').getMappedPort(80);
    process.env.DATABASE_PROXY_PORT = proxyPort.toString();
  }

  const databaseUrl = `postgres://postgres:postgres@localhost:${dbPort}/postgres`;
  process.env.DATABASE_URL = databaseUrl;

  const sql = postgres(databaseUrl);

  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './drizzle' }).finally(void sql.end);
};

export const teardown = async () => {
  if (stack) {
    await stack.down();
  }
};

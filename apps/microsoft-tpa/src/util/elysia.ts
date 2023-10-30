import { Elysia } from 'elysia';
import { env } from 'src/env';

export const createElysia = (
  config?: ConstructorParameters<typeof Elysia>[0]
) => new Elysia({ ...config, aot: env.RUNTIME === 'bun' });

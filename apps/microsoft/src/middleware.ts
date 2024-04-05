import { createElbaMiddleware } from '@elba-security/nextjs';
import { env } from '@/env';

export const { config, middleware } = createElbaMiddleware({
  webhookSecret: env.ELBA_WEBHOOK_SECRET,
});

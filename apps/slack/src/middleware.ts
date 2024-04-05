import { createElbaMiddleware } from '@elba-security/nextjs';
import { env } from '@/common/env';

export const { config, middleware } = createElbaMiddleware({
  webhookSecret: env.ELBA_WEBHOOK_SECRET,
});

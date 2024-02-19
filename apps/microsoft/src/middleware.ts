import { createElbaMiddleware } from '@elba-security/app-core/nextjs';
import { env } from '@/env';

export const middleware = createElbaMiddleware({
  webhookSecret: env.ELBA_WEBHOOK_SECRET,
});

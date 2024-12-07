import { createElbaMiddleware } from '@elba-security/nextjs';
import { env } from '@/common/env/server';

export const middleware = createElbaMiddleware({
  webhookSecret: env.ELBA_WEBHOOK_SECRET,
});

export const config = { matcher: ['/api/webhooks/elba/(.*)'] };

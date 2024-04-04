import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import type { InngestEvents } from './type';

export const inngest = new Inngest({
  id: 'datadog',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});

import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import type { InngestEvents } from './functions';

export const inngest = new Inngest({
  id: 'monday',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [rateLimitMiddleware],
  logger,
});

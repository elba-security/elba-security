import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { createElbaTrialIssuesLimitExceededMiddleware } from '@elba-security/inngest';
import type { InngestEvents } from './functions';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'outlook',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [
    unauthorizedMiddleware,
    rateLimitMiddleware,
    createElbaTrialIssuesLimitExceededMiddleware('outlook/sync.cancel'),
  ],
  logger,
});

import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { createElbaTrialIssuesLimitExceededMiddleware } from '@elba-security/inngest';
import type { InngestEvents } from './functions';
import { googleUnauthorizedMiddleware } from './middlewares/google-unauthorized-middleware';

export const inngest = new Inngest({
  id: 'google',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [
    googleUnauthorizedMiddleware,
    createElbaTrialIssuesLimitExceededMiddleware('google/sync.cancel'),
  ],
  logger,
});

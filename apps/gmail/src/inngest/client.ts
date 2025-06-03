import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { createElbaTrialIssuesLimitExceededMiddleware } from '@elba-security/inngest';
import type { InngestEvents } from './functions';
import { gmailUnauthorizedMiddleware } from './middlewares/gmail-unauthorized-middleware';

export const inngest = new Inngest({
  id: 'gmail',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [
    gmailUnauthorizedMiddleware,
    createElbaTrialIssuesLimitExceededMiddleware('gmail/sync.cancel'),
  ],
  logger,
});

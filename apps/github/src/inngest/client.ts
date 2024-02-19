import {
  ElbaInngest,
  sentryMiddleware,
  unauthorizedMiddleware,
  rateLimitMiddleware,
} from '@elba-security/app-core/inngest';
import { getErrorRetryAfter, isUnauthorizedError } from '@/connectors/github/commons/error';
import { db, dbSchema } from '@/database/client';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new ElbaInngest({
  id: 'github',
  db,
  dbSchema,
  middleware: [
    sentryMiddleware,
    rateLimitMiddleware({ getErrorRetryAfter }),
    unauthorizedMiddleware({ isUnauthorizedError }),
  ],
});

import { EventSchemas, Inngest } from 'inngest';
import { InngestEvents } from './types';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';
import { rateLimitMiddleware } from '@/inngest/middlewares/rate-limit-middleware';
import { logger } from '@elba-security/logger';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});

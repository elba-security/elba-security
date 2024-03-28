import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type InngestEvents } from './types';
import { rateLimitMiddleware } from '@/inngest/middlewares/rate-limit-middleware';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'harvest',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [rateLimitMiddleware],
  logger,
});

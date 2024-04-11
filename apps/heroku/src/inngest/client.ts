import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from '@/inngest/middlewares/rate-limit-middleware';
import { type InngestEvents } from './types';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'heroku',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [rateLimitMiddleware],
  logger,
});

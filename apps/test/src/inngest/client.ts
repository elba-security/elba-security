import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from './middlewares/sentry';
import { logger } from '@/logger';

export const inngest = new Inngest({
  id: 'test',
  schemas: new EventSchemas().fromRecord<{
    'test/logger': {};
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

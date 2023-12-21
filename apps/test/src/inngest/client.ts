import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@/logger';
import { sentryMiddleware } from './middlewares/sentry';

export const inngest = new Inngest({
  id: 'test',
  schemas: new EventSchemas().fromRecord<{
    'test/logger': object;
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

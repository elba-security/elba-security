import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';

export const inngest = new Inngest({
  id: 'test',
  schemas: new EventSchemas().fromRecord<{
    'test/logger': object;
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

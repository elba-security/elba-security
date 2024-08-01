import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import type { InngestEvents } from './functions';
// import { googleUnauthorizedMiddleware } from './middlewares/google-unauthorized-middleware';

export const inngest = new Inngest({
  id: 'google',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  // middleware: [googleUnauthorizedMiddleware],
  logger,
});

import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
id: 'livestorm',
schemas: new EventSchemas().fromRecord<{
  'livestorm/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      page:number|null;
    };
  };
  'livestorm/elba_app.uninstalled': {
    data: {
      organisationId: string;
    };
  };
  'livestorm/users.delete.requested': {
    data: {
      id: string;
      organisationId: string;
      region:string;
    };
  };
}>(),
middleware: [sentryMiddleware,rateLimitMiddleware],
logger,
});

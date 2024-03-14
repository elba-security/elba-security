import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';

export const inngest = new Inngest({
  id: 'vercel',
  schemas: new EventSchemas().fromRecord<{
    'vercel/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'vercel/elba_app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'vercel/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

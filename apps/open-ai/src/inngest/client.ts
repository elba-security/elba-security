import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';

export const inngest = new Inngest({
  id: 'open-ai',
  schemas: new EventSchemas().fromRecord<{
    'open-ai/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'open-ai/elba_app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'open-ai/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

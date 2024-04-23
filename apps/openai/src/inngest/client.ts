import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';

export const inngest = new Inngest({
  id: 'openai',
  schemas: new EventSchemas().fromRecord<{
    'openai/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'openai/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'openai/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

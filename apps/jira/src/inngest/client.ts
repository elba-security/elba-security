import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';

export const inngest = new Inngest({
  id: 'jira',
  schemas: new EventSchemas().fromRecord<{
    'jira/jira.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'jira/token.refresh.requested': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware],
  logger,
});

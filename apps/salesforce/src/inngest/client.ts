import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'salesforce',
  schemas: new EventSchemas().fromRecord<{
    'salesforce/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'salesforce/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'salesforce/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'salesforce/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'salesforce/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});

import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'doppler',
  schemas: new EventSchemas().fromRecord<{
    'doppler/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'doppler/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'doppler/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'doppler/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});

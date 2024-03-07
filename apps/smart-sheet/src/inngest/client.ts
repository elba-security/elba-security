import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'smart-sheet',
  schemas: new EventSchemas().fromRecord<{
    'smart-sheet/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'smart-sheet/smart-sheet.token.refresh.requested': {
      data: {
        organisationId: string;
        refreshToken?: string;
        region?: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});

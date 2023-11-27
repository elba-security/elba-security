import { EventSchemas, Inngest } from 'inngest';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'github',
  schemas: new EventSchemas().fromRecord<{
    'users/page_sync.requested': {
      data: {
        installationId: number;
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        accountLogin: string;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
});

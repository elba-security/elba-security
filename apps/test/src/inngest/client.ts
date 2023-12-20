import { EventSchemas, Inngest } from 'inngest';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'users/sync_page.triggered': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
});

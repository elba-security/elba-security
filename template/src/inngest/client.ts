import { EventSchemas, Inngest } from 'inngest';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'users/sync': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
});

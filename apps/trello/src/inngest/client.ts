import { EventSchemas, Inngest } from 'inngest';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  eventKey:
    'Rs3YVa6iukXgm_M35Vdcyyw4elHIKySbS6IC997BBWZaHAwuz7SGACmb5p0PV1TXXwAcCM1hLbymi_hCaMeCzw',
  schemas: new EventSchemas().fromRecord<{
    'trello/users/sync_page.triggered': {
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

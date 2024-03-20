import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';


export const inngest = new Inngest({
 id: 'apollo',
 schemas: new EventSchemas().fromRecord<{
   'apollo/users.page_sync.requested': {
     data: {
       organisationId: string;
       region: string;
       isFirstSync: boolean;
       syncStartedAt: number;
       page:string|null;
     };
   };
   'apollo/elba_app.uninstalled': {
     data: {
       organisationId: string;
     };
   };
   'apollo/users.delete.requested': {
     data: {
       id: string;
       organisationId: string;
       region:string;
     };
   };
 }>(),
 middleware: [sentryMiddleware],
 logger,
});

import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';


export type InngestEvents = {
 'heroku/users.page_sync.requested': {
   data: {
     organisationId: string;
     region: string;
     isFirstSync: boolean;
     syncStartedAt: number;
     page: string | null;
   };
 };
 'heroku/token.refresh.requested': {
   data: {
     organisationId: string;
     expiresAt: number;
   };
 };
 'heroku/users.delete.requested': {
   data: {
     id: string;
     organisationId: string;
   };
 };
 'heroku/app.uninstall.requested': { data: { organisationId: string } };
};


export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
 typeof inngest,
 T
>;

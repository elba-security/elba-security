import { syncUsers } from './users/sync-users';
import { usersFunctions, type UsersEvents } from './users';

export * from './users';

export const inngestFunctions = [
    ...usersFunctions,
  ];
  
  export type InngestEvents = UsersEvents;

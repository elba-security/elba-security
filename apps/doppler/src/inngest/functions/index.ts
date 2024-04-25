import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize];

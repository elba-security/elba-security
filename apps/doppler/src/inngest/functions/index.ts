import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync'; 

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize];

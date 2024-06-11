import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize'; 

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize];

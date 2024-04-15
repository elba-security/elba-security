import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-sync';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize];

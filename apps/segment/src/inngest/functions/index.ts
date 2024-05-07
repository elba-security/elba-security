import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';
import { deleteSourceUser } from './users/delete-users';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize, deleteSourceUser];

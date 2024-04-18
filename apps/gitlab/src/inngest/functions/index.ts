import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { refreshToken } from './token/refresh-token';
import { deleteSourceUsers } from './users/delete-users';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize, refreshToken, deleteSourceUsers];

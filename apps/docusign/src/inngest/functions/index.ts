import { refreshToken } from './token/refresh-token';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUsers } from './users/delete-users';

export const inngestFunctions = [refreshToken, syncUsers, scheduleUsersSync, deleteUsers];

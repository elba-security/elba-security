import { refreshToken } from './token/refresh-token';
import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { deleteSourceUsers } from './users/delete-user';

export const inngestFunctions = [
  refreshToken,
  synchronizeUsers,
  scheduleUsersSynchronize,
  deleteSourceUsers,
];

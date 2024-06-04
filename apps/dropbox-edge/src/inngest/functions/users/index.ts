import { syncUsers } from './sync-users';
import { scheduleUsersSync } from './schedule-users-sync';
import { deleteUser } from './delete-user';

export const usersFunctions = [syncUsers, deleteUser, scheduleUsersSync];

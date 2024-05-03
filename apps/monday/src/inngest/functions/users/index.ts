import { scheduleUsersSync } from './schedule-user-sync';
import { syncUsers } from './sync-users';

export const usersFunctions = [syncUsers, scheduleUsersSync];

import { scheduleUsersSync } from './schedule-users-sync';
import type { SynchronizeUsersEvents } from './synchronize-users';
import { synchronizeUsers } from './synchronize-users';

export type UsersEvents = SynchronizeUsersEvents;

export const usersFunctions = [synchronizeUsers, scheduleUsersSync];

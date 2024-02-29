import { scheduleUsersSyncs } from './schedule-user-sync';
import type { SynchronizeUsersEvents } from './sync-users';
import { syncUsers } from './sync-users';

export type UsersEvents = SynchronizeUsersEvents;

export const usersFunctions = [syncUsers, scheduleUsersSyncs];

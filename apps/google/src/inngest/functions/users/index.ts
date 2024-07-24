import { scheduleUsersSync } from './schedule-sync';
import type { SyncUsersEvents } from './sync';
import { syncUsers } from './sync';

export type UsersEvents = SyncUsersEvents;

export const usersFunctions = [scheduleUsersSync, syncUsers];

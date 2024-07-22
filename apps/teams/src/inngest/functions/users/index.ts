import { syncUsers } from '@/inngest/functions/users/sync-users';
import { scheduleUsersSync } from '@/inngest/functions/users/schedule-users-sync';

export const usersFunctions = [syncUsers, scheduleUsersSync];

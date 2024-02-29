import { syncUsersSchedule } from '@/inngest/functions/users/sync-users-schedule';
import { refreshToken } from './tokens/refresh-token';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [refreshToken, syncUsers, syncUsersSchedule];

import { syncUsers } from './users/sync-users';
import { handleRefreshToken } from './token/refresh-token';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';

export const inngestFunctions = [syncUsers, handleRefreshToken, scheduleUsersSyncs];

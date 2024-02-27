import { handleRefreshToken } from './token/refresh-token';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, handleRefreshToken, scheduleUsersSyncs];

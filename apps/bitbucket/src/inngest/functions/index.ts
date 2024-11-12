import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';
import { refreshToken } from './token/refresh-token';

export const inngestFunctions = [syncUsers, refreshToken, scheduleUsersSyncs, removeOrganisation];

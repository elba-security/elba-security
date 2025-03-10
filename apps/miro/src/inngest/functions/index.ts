import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, removeOrganisation];

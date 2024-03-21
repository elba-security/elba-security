import { syncUsersPage } from './users/sync-users-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { removeOrganisation } from './organisation/remove-organisation';

export const inngestFunctions = [syncUsersPage, scheduleUsersSyncs, removeOrganisation];

import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsersPage } from './users/sync-users';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [syncUsersPage, scheduleUsersSyncs, removeOrganisation];

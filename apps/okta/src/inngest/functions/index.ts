import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';
import { deleteUser } from './users/delete-users';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, removeOrganisation, deleteUser];

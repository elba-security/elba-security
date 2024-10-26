import { removeOrganisation } from './organisation/remove-organisation';
import { deleteUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, deleteUser, removeOrganisation];

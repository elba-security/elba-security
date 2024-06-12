import { syncUsers } from './users/sync-users';
import { deleteUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [syncUsers, deleteUser, scheduleUsersSyncs, removeOrganisation];

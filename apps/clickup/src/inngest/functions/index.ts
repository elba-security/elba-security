import { removeOrganisation } from './organisation/remove-organisation';
import { deleteClickUpUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users-page';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, deleteClickUpUser, removeOrganisation];

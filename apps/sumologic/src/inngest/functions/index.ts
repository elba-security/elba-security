import { removeOrganisation } from './organisations/remove-organisation';
import { deleteUser } from './users/delete-user';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, scheduleUsersSync, deleteUser, removeOrganisation];

import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [syncUsers, scheduleUsersSync, deleteUser, removeOrganisation];

import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUsers } from './users/delete-users';

export const inngestFunctions = [syncUsers, scheduleUsersSync, deleteUsers, removeOrganisation];

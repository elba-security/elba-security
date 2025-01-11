import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { removeOrganisation } from './organisations/remove-organisation';
import { deleteUser } from './users/delete-users';

export const inngestFunctions = [syncUsers, scheduleUsersSync, removeOrganisation, deleteUser];

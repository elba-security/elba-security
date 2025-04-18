import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';

export const inngestFunctions = [removeOrganisation, scheduleUsersSync, syncUsers, deleteUser];
